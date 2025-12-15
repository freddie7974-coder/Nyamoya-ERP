// src/components/SupplierScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Table, Thead, Tbody, Tr, Th, Td, Heading, HStack, Input, useToast, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, VStack, Text, Badge, Textarea } from '@chakra-ui/react'
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function SupplierScreen({ onBack }) {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('') // e.g., Raw Materials, Utilities
  const [notes, setNotes] = useState('')

  const toast = useToast()

  // 1. Fetch Suppliers
  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const q = query(collection(db, "suppliers"), orderBy("name"))
      const querySnapshot = await getDocs(q)
      const list = []
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setSuppliers(list)
    } catch (error) {
      toast({ title: "Error loading suppliers", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 2. Add New Supplier
  const handleAddSupplier = async () => {
    if (!name) {
      toast({ title: "Supplier Name is required", status: "warning" })
      return
    }

    try {
      await addDoc(collection(db, "suppliers"), {
        name,
        phone,
        category: category || 'General',
        notes,
        joinedDate: serverTimestamp()
      })

      toast({ title: "Supplier Added! 🚚", status: "success" })
      setName('')
      setPhone('')
      setCategory('')
      setNotes('')
      onClose()
      fetchSuppliers() 

    } catch (error) {
      console.error(error)
      toast({ title: "Error adding supplier", status: "error" })
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <Button onClick={onBack} variant="ghost">← Back</Button>
          <Heading size="md" color="orange.600">Supplier Directory 🚚</Heading>
        </HStack>
        <Button colorScheme="orange" onClick={onOpen}>+ Add Supplier</Button>
      </HStack>

      <Box bg="white" shadow="md" borderRadius="xl" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.100">
            <Tr>
              <Th>Supplier Name</Th>
              <Th>Phone / Contact</Th>
              <Th>Category</Th>
              <Th>Notes</Th>
            </Tr>
          </Thead>
          <Tbody>
            {suppliers.map((sup) => (
              <Tr key={sup.id} _hover={{ bg: "gray.50" }}>
                <Td fontWeight="bold">{sup.name}</Td>
                <Td>{sup.phone || 'N/A'}</Td>
                <Td>
                  <Badge colorScheme="orange">{sup.category}</Badge>
                </Td>
                <Td fontSize="sm" color="gray.600" maxW="200px" isTruncated>
                  {sup.notes}
                </Td>
              </Tr>
            ))}
            {suppliers.length === 0 && (
              <Tr><Td colSpan={4} textAlign="center" py={10}>No suppliers found. Add your first vendor!</Td></Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Add Supplier Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Supplier</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Supplier Name</Text>
                <Input placeholder="e.g. Juma Agro Farms" value={name} onChange={(e) => setName(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Phone / Contact</Text>
                <Input placeholder="e.g. 0755..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Category (What do they sell?)</Text>
                <Input placeholder="e.g. Peanuts, Packaging, Fuel" value={category} onChange={(e) => setCategory(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Notes</Text>
                <Textarea placeholder="e.g. Delivers on Tuesdays only" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="orange" onClick={handleAddSupplier}>Save Supplier</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}