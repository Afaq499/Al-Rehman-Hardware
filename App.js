import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AddProduct from './AddProduct';
import ProductList from './ProductList';
import CategoryManager from './CategoryManager';

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryRefreshTrigger, setCategoryRefreshTrigger] = useState(0);

  useEffect(() => {
    // Catch any unhandled errors
    const errorHandler = (error) => {
      console.error('App error:', error);
      setError(error.message);
    };
    
    // Test Firebase connection
    try {
      const { db } = require('./firebase');
      if (!db) {
        throw new Error('Firebase not initialized');
      }
    } catch (err) {
      errorHandler(err);
    }
  }, []);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalVisible(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingProduct(null);
  };

  const handleProductSaved = () => {
    // Trigger refresh in ProductList
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCategoryChange = () => {
    // Trigger refresh for categories in AddProduct and ProductList
    setCategoryRefreshTrigger(prev => prev + 1);
  };

  const handleManageCategories = () => {
    setCategoryModalVisible(true);
  };

  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#FF3B30" />
            <Text style={styles.errorText}>App Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setError(null)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar style="dark" />
        <ProductList 
          onEditProduct={handleEditProduct} 
          refreshTrigger={refreshTrigger}
          categoryRefreshTrigger={categoryRefreshTrigger}
        />
        
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, styles.fabSecondary]}
            onPress={handleManageCategories}
            activeOpacity={0.8}
          >
            <Ionicons name="folder" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddProduct}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        <AddProduct
          visible={modalVisible}
          onClose={handleCloseModal}
          product={editingProduct}
          onProductSaved={handleProductSaved}
          categoryRefreshTrigger={categoryRefreshTrigger}
        />

        <CategoryManager
          visible={categoryModalVisible}
          onClose={() => setCategoryModalVisible(false)}
          onCategoryChange={handleCategoryChange}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    alignItems: 'flex-end',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    marginBottom: 12,
  },
});
