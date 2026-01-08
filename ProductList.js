import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  startAfter,
  orderBy,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const PAGE_SIZE = 10;

export default function ProductList({ onEditProduct, refreshTrigger, categoryRefreshTrigger }) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, orderBy('name'));
      const snapshot = await getDocs(q);
      const categoriesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchProducts = useCallback(async (searchTerm = '', categoryId = null, reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setProducts([]);
        setLastVisible(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const productsRef = collection(db, 'products');
      let allProducts = [];

      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        
        // Query database: Get products ordered by name, then filter client-side
        // This approach avoids requiring composite indexes while still querying the database
        let q = query(productsRef, orderBy('name'), limit(PAGE_SIZE * 3));
        
        if (!reset && lastVisible) {
          q = query(productsRef, orderBy('name'), startAfter(lastVisible), limit(PAGE_SIZE * 3));
        }

        const snapshot = await getDocs(q);
        const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filter by search term (name contains or tags contain) and category
        const filtered = allDocs.filter(p => {
          const nameMatch = p.name?.toLowerCase().includes(searchLower);
          const tagsMatch = p.tags?.some(tag => tag.toLowerCase().includes(searchLower));
          const categoryMatch = !categoryId || p.categoryId === categoryId;
          return (nameMatch || tagsMatch) && categoryMatch;
        });

        allProducts = filtered.slice(0, PAGE_SIZE);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(filtered.length > PAGE_SIZE || snapshot.docs.length === PAGE_SIZE * 3);
      } else {
        // No search - get all products with pagination
        let q = query(productsRef, orderBy('name'), limit(PAGE_SIZE * 3));
        
        if (!reset && lastVisible) {
          q = query(productsRef, orderBy('name'), startAfter(lastVisible), limit(PAGE_SIZE * 3));
        }

        const snapshot = await getDocs(q);
        const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filter by category if selected
        if (categoryId) {
          allProducts = allDocs.filter(p => p.categoryId === categoryId).slice(0, PAGE_SIZE);
        } else {
          allProducts = allDocs.slice(0, PAGE_SIZE);
        }
        
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(allDocs.length === PAGE_SIZE * 3);
      }

      if (reset) {
        setProducts(allProducts);
      } else {
        setProducts(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = allProducts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastVisible, selectedCategoryId]);

  useEffect(() => {
    fetchCategories();
  }, [categoryRefreshTrigger]);

  useEffect(() => {
    // Debounce search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchProducts(search, selectedCategoryId, true);
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [search, selectedCategoryId]);

  useEffect(() => {
    // Initial load
    fetchProducts('', selectedCategoryId, true);
  }, []);

  useEffect(() => {
    // Refresh when refreshTrigger changes (after product update)
    if (refreshTrigger > 0) {
      fetchProducts(search, selectedCategoryId, true);
    }
  }, [refreshTrigger]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(search, selectedCategoryId, false);
    }
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : null;
  };

  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return 'All Categories';
    const category = categories.find(c => c.id === selectedCategoryId);
    return category ? category.name : 'All Categories';
  };

  const handleDelete = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'products', product.id));
              // Refresh the list
              fetchProducts(search, selectedCategoryId, true);
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price) => {
    return `Rs ${Number(price).toFixed(2)}`;
  };

  const calculateProfit = (purchasePrice, salePrice) => {
    return salePrice - purchasePrice;
  };

  const calculateProfitMargin = (purchasePrice, salePrice) => {
    if (purchasePrice === 0) return 0;
    return ((salePrice - purchasePrice) / purchasePrice) * 100;
  };

  const renderProduct = ({ item }) => {
    const profit = calculateProfit(item.purchasePrice || 0, item.salePrice || 0);
    const profitMargin = calculateProfitMargin(item.purchasePrice || 0, item.salePrice || 0);
    const isLowStock = (item.totalItems || 0) < 10;

    return (
      <View style={styles.productCard}>
        {/* Image on left */}
        <View style={styles.imageContainer}>
          {item.imageBase64 ? (
            <Image source={{ uri: item.imageBase64 }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={24} color="#ccc" />
            </View>
          )}
        </View>

        {/* Details on right */}
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name || 'Unnamed Product'}
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEditProduct(item)}
              >
                <Ionicons name="create-outline" size={16} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { marginLeft: 4 }]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Purchase</Text>
              <Text style={styles.purchasePrice} numberOfLines={1}>
                {formatPrice(item.purchasePrice || 0)}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Sale</Text>
              <Text style={styles.salePrice} numberOfLines={1}>
                {formatPrice(item.salePrice || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.profitContainer}>
            <Text style={styles.profitLabel}>Profit:</Text>
            <Text style={[styles.profit, profit >= 0 ? styles.profitPositive : styles.profitNegative]} numberOfLines={1}>
              {formatPrice(profit)} ({profitMargin.toFixed(1)}%)
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.stockContainer}>
              <Ionicons
                name={isLowStock ? 'warning' : 'cube'}
                size={12}
                color={isLowStock ? '#ff9500' : '#666'}
              />
              <Text style={[styles.stockText, isLowStock && styles.lowStock]}>
                {item.totalItems || 0}
              </Text>
            </View>

            {item.categoryId && getCategoryName(item.categoryId) && (
              <View style={styles.categoryBadge}>
                <Ionicons name="folder" size={10} color="#007AFF" />
                <Text style={styles.categoryText} numberOfLines={1}>
                  {getCategoryName(item.categoryId)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { marginTop: Math.max(insets.top, 16) }]}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name or tags..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.categoryFilter}
          onPress={() => setCategoryDropdownVisible(true)}
        >
          <Ionicons name="filter" size={18} color="#007AFF" />
          <Text style={styles.categoryFilterText}>{getSelectedCategoryName()}</Text>
          <Ionicons name="chevron-down" size={18} color="#007AFF" />
        </TouchableOpacity>
        {selectedCategoryId && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Dropdown Modal */}
      <Modal
        visible={categoryDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setCategoryDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setCategoryDropdownVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList}>
              <TouchableOpacity
                style={[styles.dropdownItem, !selectedCategoryId && styles.dropdownItemSelected]}
                onPress={() => {
                  setSelectedCategoryId(null);
                  setCategoryDropdownVisible(false);
                }}
              >
                <Text style={[styles.dropdownItemText, !selectedCategoryId && styles.dropdownItemTextSelected]}>
                  All Categories
                </Text>
                {!selectedCategoryId && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.dropdownItem, selectedCategoryId === category.id && styles.dropdownItemSelected]}
                  onPress={() => {
                    setSelectedCategoryId(category.id);
                    setCategoryDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedCategoryId === category.id && styles.dropdownItemTextSelected]}>
                    {category.name}
                  </Text>
                  {selectedCategoryId === category.id && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
              {categories.length === 0 && (
                <View style={styles.dropdownEmpty}>
                  <Text style={styles.dropdownEmptyText}>No categories available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {search ? 'No products found' : 'No products yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {search ? 'Try a different search term' : 'Tap the + button to add your first product'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          style={styles.flatList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListHeaderComponent={
            <Text style={styles.resultsText}>
              {products.length} {products.length === 1 ? 'product' : 'products'} found
              {hasMore && ' (scroll for more)'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100, // Extra padding for FAB button
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    padding: 8,
    minHeight: 100,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 9,
    color: '#999',
    marginBottom: 2,
  },
  purchasePrice: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  salePrice: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  profitLabel: {
    fontSize: 10,
    color: '#666',
    marginRight: 4,
  },
  profit: {
    fontSize: 11,
    fontWeight: '600',
  },
  profitPositive: {
    color: '#34C759',
  },
  profitNegative: {
    color: '#FF3B30',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    fontSize: 10,
    color: '#666',
  },
  lowStock: {
    color: '#ff9500',
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: '60%',
  },
  categoryText: {
    fontSize: 9,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
    gap: 8,
  },
  categoryFilterText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  clearFilterButton: {
    padding: 8,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dropdownEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 16,
    color: '#666',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    color: '#666',
  },
  lowStock: {
    color: '#ff9500',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  moreTags: {
    fontSize: 11,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
