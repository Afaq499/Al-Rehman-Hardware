import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export default function AddProduct({ visible, onClose, product = null, onProductSaved, categoryRefreshTrigger }) {
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [tags, setTags] = useState('');
  const [totalItems, setTotalItems] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);

  const isEditMode = !!product;

  useEffect(() => {
    fetchCategories();
  }, [visible, categoryRefreshTrigger]);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setPurchasePrice(product.purchasePrice?.toString() || '');
      setSalePrice(product.salePrice?.toString() || '');
      setTags(product.tags?.join(', ') || '');
      setTotalItems(product.totalItems?.toString() || '');
      setImageBase64(product.imageBase64 || null);
      setSelectedCategoryId(product.categoryId || null);
    } else {
      // Reset form for add mode
      setName('');
      setPurchasePrice('');
      setSalePrice('');
      setTags('');
      setTotalItems('');
      setImageBase64(null);
      setSelectedCategoryId(null);
    }
  }, [product, visible]);

  const fetchCategories = async () => {
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
  };

  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return 'Select category (optional)';
    const category = categories.find(c => c.id === selectedCategoryId);
    return category ? category.name : 'Select category (optional)';
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take pictures.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.4,
      base64: true,
    });

    if (res.canceled) return;

    const photo = res.assets[0];

    const compressed = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: 400 } }],
      {
        compress: 0.4,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    setImageBase64(`data:image/jpeg;base64,${compressed.base64}`);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Media library permission is required.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.4,
      base64: true,
    });

    if (res.canceled) return;

    const photo = res.assets[0];

    const compressed = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: 400 } }],
      {
        compress: 0.4,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    setImageBase64(`data:image/jpeg;base64,${compressed.base64}`);
  };

  const saveProduct = async () => {
    if (!name || !purchasePrice || !salePrice || !totalItems) {
      Alert.alert('Required Fields', 'Please fill in all required fields (Name, Purchase Price, Sale Price, Total Items)');
      return;
    }

    if (isNaN(purchasePrice) || isNaN(salePrice) || isNaN(totalItems)) {
      Alert.alert('Invalid Input', 'Purchase Price, Sale Price, and Total Items must be numbers');
      return;
    }

    setLoading(true);
    try {
      // Convert tags string to array (comma-separated)
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const productData = {
        name: name.trim(),
        purchasePrice: Number(purchasePrice),
        salePrice: Number(salePrice),
        tags: tagsArray,
        totalItems: Number(totalItems),
        imageBase64,
        ...(selectedCategoryId && { categoryId: selectedCategoryId }),
      };

      if (isEditMode) {
        await updateDoc(doc(db, 'products', product.id), productData);
        Alert.alert('Success', 'Product updated successfully!');
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp(),
        });
        Alert.alert('Success', 'Product added successfully!');
      }

      handleClose();
      // Trigger refresh in ProductList
      if (onProductSaved) {
        onProductSaved();
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} product. Please try again.`);
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} product:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setPurchasePrice('');
    setSalePrice('');
    setTags('');
    setTotalItems('');
    setImageBase64(null);
    setSelectedCategoryId(null);
    setCategoryDropdownVisible(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEditMode ? 'Edit Product' : 'Add New Product'}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setCategoryDropdownVisible(true)}
              >
                <Text style={[styles.dropdownText, !selectedCategoryId && styles.dropdownPlaceholder]}>
                  {getSelectedCategoryName()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Purchase Price *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Sale Price *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={salePrice}
                  onChangeText={setSalePrice}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Items *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                keyboardType="numeric"
                value={totalItems}
                onChangeText={setTotalItems}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tags (for searching)</Text>
              <Text style={styles.hint}>Separate tags with commas (e.g., hardware, tools, electrical)</Text>
              <TextInput
                style={styles.input}
                placeholder="hardware, tools, electrical"
                value={tags}
                onChangeText={setTags}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Image</Text>
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={takePicture}>
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.imageButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.imageButton, { marginLeft: 10 }]} onPress={pickImage}>
                  <Ionicons name="image" size={20} color="#fff" />
                  <Text style={styles.imageButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {imageBase64 && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: imageBase64 }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setImageBase64(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Category Dropdown Modal */}
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
                  <Text style={styles.dropdownTitle}>Select Category</Text>
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
                      None (No category)
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
                      <Text style={styles.dropdownEmptySubtext}>Add categories from the main screen</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.disabledButton]}
              onPress={saveProduct}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Product' : 'Save Product')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    maxHeight: '70%',
  },
  formGroup: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  imageButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  imagePreview: {
    marginTop: 12,
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: 60,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
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
    marginBottom: 8,
  },
  dropdownEmptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
