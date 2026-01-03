// src/components/StockScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Table, Thead, Tbody, Tr, Th, Td, Heading, HStack, useToast, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, VStack, Text, Input, Divider } from '@chakra-ui/react'
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { logAction } from '../utils/logger' // Assuming you have this logger

export default function StockScreen({ onBack }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modals
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()

  // Form State
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  
  // 🆕 New Optional State for Opening Balance
  const [initialStock, setInitialStock] = useState('')
  const [initialCost, setInitialCost] = useState('')

  const [editingProduct, setEditingProduct] = useState(null)

  const toast = useToast()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "inventory"))
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setProducts(items)
    } catch (error) {
      toast({ title: "Error loading products", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 1. Create New Product Catalogue Item 📦
  const handleCreateProduct = async () => {
    if (!newName || !newPrice) {
      toast({ title: "Name and Price are required", status: "warning" })
      return
    }

    try {
      // 🆕 Logic: Use opening balance if provided
      const startStock = parseFloat(initialStock) || 0
      const startCost = parseFloat(initialCost) || 0

      await addDoc(collection(db, "inventory"), {
        name: newName,
        price: parseFloat(newPrice),
        currentStock: startStock,           // 👈 Set starting stock
        averageUnitCost: startCost,         // 👈 Set starting cost (Critical for profit calc!)
        category: "Finished Goods",
        lastUpdated: serverTimestamp()
      })
      
      // Log the creation
      if (startStock > 0) {
        await logAction('Admin', 'Opening Balance', `Added ${newName} with opening stock: ${startStock} units @ ${startCost}/unit`)
      } else {
        await logAction('Admin', 'Create Product', `Added ${newName} to catalogue`)
      }

      toast({ title: "Product Added to Catalogue! 🎉", status: "success" })
      
      // Reset Form
      setNewName('')
      setNewPrice('')
      setInitialStock('')
      setInitialCost('')
      
      onAddClose()
      fetchProducts()
    } catch (error) {
      console.error(error)
      toast({ title: "Error creating product", status: "error" })
    }
  }

  // 2. Edit Price Logic ✏️
  const handleUpdatePrice = async () => {
    if (!newPrice || !editingProduct) return
    
    try {
      const prodRef = doc(db, "inventory", editingProduct.id)
      await updateDoc(prodRef, { price: parseFloat(newPrice) })
      
      toast({ title: "Price Updated ✅", status: "success" })
      setEditingProduct(null)
      setNewPrice('')
      onEditClose()
      fetchProducts()
    } catch (error) {
      toast({ title: "Update failed", status: "error" })
    }
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setNewPrice(product.price)
    onEditOpen()
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <Button onClick={onBack} variant="ghost">← Back</Button>
          <Heading size="md" color="purple.600">Product Catalogue 📦</Heading>
        </HStack>
        <Button colorScheme="purple" onClick={onAddOpen}>+ Add Product</Button>
      </HStack>

      <Box bg="white" shadow="md" borderRadius="xl" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.100">
            <Tr>
              <Th>Product Name</Th>
              <Th isNumeric>Current Stock</Th>
              <Th isNumeric>Selling Price</Th>
              <Th isNumeric>Est. Cost</Th> {/* 🆕 Added column to see cost */}
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((prod) => (
              <Tr key={prod.id}>
                <Td fontWeight="bold">{prod.name}</Td>
                <Td isNumeric fontSize="lg" color={prod.currentStock < 10 ? "red.500" : "green.600"}>
                  {prod.currentStock}
                </Td>
                <Td isNumeric>TZS {prod.price?.toLocaleString()}</Td>
                <Td isNumeric color="gray.500">
                   {/* Show Cost so you know your profit margin */}
                   TZS {Math.round(prod.averageUnitCost || 0).toLocaleString()}
                </Td>
                <Td>
                  <Button size="sm" variant="outline" onClick={() => openEditModal(prod)}>
                    Edit Price
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* MODAL 1: Create New Product (UPDATED) */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Product</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Product Name *</Text>
                <Input placeholder="e.g. Choco PB 400g" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Selling Price (TZS) *</Text>
                <Input type="number" placeholder="e.g. 6000" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </Box>

              <Divider />
              <Text fontSize="sm" color="gray.500">Opening Balance (Optional)</Text>

              <HStack w="100%">
                <Box w="50%">
                   <Text mb={2} fontSize="sm">Starting Stock</Text>
                   <Input type="number" placeholder="0" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
                </Box>
                <Box w="50%">
                   <Text mb={2} fontSize="sm">Cost to Make (Per Unit)</Text>
                   <Input type="number" placeholder="0" value={initialCost} onChange={(e) => setInitialCost(e.target.value)} />
                </Box>
              </HStack>
              <Text fontSize="xs" color="orange.500">
                *Only set "Cost to Make" if adding starting stock. Otherwise leave 0.
              </Text>

            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>Cancel</Button>
            <Button colorScheme="purple" onClick={handleCreateProduct}>Save Product</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MODAL 2: Edit Price */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Price: {editingProduct?.name}</ModalHeader>
          <ModalBody>
            <Text mb={2}>New Selling Price (TZS):</Text>
            <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleUpdatePrice}>Update</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  )
}