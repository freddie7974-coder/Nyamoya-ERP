// src/components/RawMaterialScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Table, Thead, Tbody, Tr, Th, Td, Heading, HStack, Input, useToast, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Text, VStack, Badge, Select, Divider } from '@chakra-ui/react'
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { logAction } from '../utils/logger'

export default function RawMaterialScreen({ onBack }) {
  const [materials, setMaterials] = useState([])
  const [suppliers, setSuppliers] = useState([]) 
  const [loading, setLoading] = useState(true)
  
  // Modals
  const { isOpen: isRestockOpen, onOpen: onRestockOpen, onClose: onRestockClose } = useDisclosure()
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure()
  
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  
  // Restock Form
  const [addQty, setAddQty] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState('')

  // Create New Form (Updated 🆕)
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [initialStock, setInitialStock] = useState('') // New!
  const [initialCost, setInitialCost] = useState('')   // New!

  const toast = useToast()

  // 1. Fetch Data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const matSnap = await getDocs(collection(db, "raw_materials"))
      const matItems = []
      matSnap.forEach((doc) => matItems.push({ id: doc.id, ...doc.data() }))
      setMaterials(matItems)

      const supSnap = await getDocs(query(collection(db, "suppliers"), orderBy("name")))
      const supItems = []
      supSnap.forEach((doc) => supItems.push({ id: doc.id, ...doc.data() }))
      setSuppliers(supItems)

    } catch (error) {
      toast({ title: "Error loading data", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 2. Create New Material (Enhanced 🚀)
  const handleCreate = async () => {
    if (!newName || !newUnit) {
      toast({ title: "Name and Unit are required", status: "warning" })
      return
    }

    try {
      // Logic: If user enters opening stock, use it. If not, default to 0.
      const startStock = parseFloat(initialStock) || 0
      const startCost = parseFloat(initialCost) || 0

      await addDoc(collection(db, "raw_materials"), {
        name: newName,
        unit: newUnit, 
        currentStock: startStock,   // 👈 Sets the opening balance
        averageCost: startCost,     // 👈 Sets the starting price
        lastUpdated: serverTimestamp()
      })

      // Optional: If they added stock, log it as an "Opening Balance" action
      if (startStock > 0) {
        await logAction('Admin', 'Opening Balance', `Created ${newName} with starting stock: ${startStock}${newUnit} @ ${startCost}`)
      } else {
        await logAction('Admin', 'Created Material', `Added new material: ${newName}`)
      }

      toast({ title: "New Material Added! 🎉", status: "success" })
      
      // Reset Form
      setNewName('')
      setNewUnit('')
      setInitialStock('')
      setInitialCost('')
      
      onCreateClose()
      fetchData()

    } catch (error) {
      toast({ title: "Error creating material", status: "error" })
    }
  }

  // 3. Handle Restock
  const handleRestock = async () => {
    if (!addQty || !purchasePrice) {
      toast({ title: "Please fill all fields", status: "warning" })
      return
    }
    
    const supplierObj = suppliers.find(s => s.id === selectedSupplierId)
    const supplierName = supplierObj ? supplierObj.name : "Unknown Supplier"

    const qty = parseFloat(addQty)
    const price = parseFloat(purchasePrice)
    const currentStock = selectedMaterial.currentStock || 0
    const currentAvgCost = selectedMaterial.averageCost || 0

    const oldValue = currentStock * currentAvgCost
    const newValue = qty * price
    const totalStock = currentStock + qty
    const newAverageCost = totalStock > 0 ? (oldValue + newValue) / totalStock : price

    try {
      const materialRef = doc(db, "raw_materials", selectedMaterial.id)
      await updateDoc(materialRef, {
        currentStock: totalStock,
        averageCost: newAverageCost,
        lastUpdated: serverTimestamp()
      })
      
      await addDoc(collection(db, "expenses"), {
        description: `Purchased ${selectedMaterial.name} (${qty}${selectedMaterial.unit})`,
        amount: newValue,
        category: "Raw Materials",
        supplier: supplierName,
        supplierId: selectedSupplierId || null,
        date: serverTimestamp(),
        user: "Admin",
        type: "Operating"
      })

      await logAction('Admin', 'Restock Material', `Bought ${qty}${selectedMaterial.unit} ${selectedMaterial.name} from ${supplierName}`)
      
      toast({ title: "Stock Updated! 🔗", status: "success" })
      setAddQty('')
      setPurchasePrice('')
      setSelectedSupplierId('')
      onRestockClose()
      fetchData()
    } catch (error) {
      toast({ title: "Error updating stock", status: "error" })
    }
  }

  const openRestockModal = (material) => {
    setSelectedMaterial(material)
    onRestockOpen()
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="900px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <Button onClick={onBack} variant="ghost">← Back</Button>
          <Heading size="md" color="teal.600">Raw Materials 🥜</Heading>
        </HStack>
        <Button colorScheme="teal" onClick={onCreateOpen}>+ New Material</Button>
      </HStack>

      <Box bg="white" shadow="md" borderRadius="xl" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.100">
            <Tr>
              <Th>Material</Th>
              <Th isNumeric>Stock</Th>
              <Th isNumeric>Avg Cost</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {materials.map((mat) => (
              <Tr key={mat.id}>
                <Td fontWeight="bold">{mat.name} <Badge fontSize="xs">{mat.unit}</Badge></Td>
                <Td isNumeric>{mat.currentStock?.toLocaleString()}</Td>
                <Td isNumeric>TZS {Math.round(mat.averageCost || 0).toLocaleString()}</Td>
                <Td>
                  <Button size="sm" colorScheme="teal" variant="outline" onClick={() => openRestockModal(mat)}>
                    Restock
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* MODAL 1: Create New Material (UPGRADED) */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Material</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Material Name *</Text>
                <Input placeholder="e.g. Sugar" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Unit *</Text>
                <Input placeholder="e.g. kg" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
              </Box>
              
              <Divider />
              <Text fontSize="sm" color="gray.500">Opening Balance (Optional)</Text>
              
              <HStack w="100%">
                <Box w="50%">
                   <Text mb={2} fontSize="sm">Starting Stock</Text>
                   <Input type="number" placeholder="0" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
                </Box>
                <Box w="50%">
                   <Text mb={2} fontSize="sm">Cost per Unit</Text>
                   <Input type="number" placeholder="0" value={initialCost} onChange={(e) => setInitialCost(e.target.value)} />
                </Box>
              </HStack>

            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreate}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MODAL 2: Restock */}
      <Modal isOpen={isRestockOpen} onClose={onRestockClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Restock {selectedMaterial?.name}</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Select Supplier</Text>
                <Select 
                  placeholder="Select Supplier" 
                  value={selectedSupplierId} 
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                >
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </Select>
                <Text fontSize="xs" color="gray.500" mt={1}>Don't see them? Add in Supplier screen first.</Text>
              </Box>

              <Box w="100%">
                <Text mb={2} fontWeight="bold">Quantity Received</Text>
                <Input type="number" placeholder="0" value={addQty} onChange={(e) => setAddQty(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Buying Price (Per Unit)</Text>
                <Input type="number" placeholder="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRestockClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleRestock}>Update Stock</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}