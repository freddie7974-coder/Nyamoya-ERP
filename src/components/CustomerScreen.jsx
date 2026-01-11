// src/components/CustomerScreen.jsx
import { useState, useEffect } from 'react'
import { 
  Box, Button, Table, Thead, Tbody, Tr, Th, Td, Heading, HStack, Input, 
  useToast, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, 
  ModalBody, ModalFooter, useDisclosure, VStack, Text, Badge, IconButton, Tooltip,
  Alert, AlertIcon 
} from '@chakra-ui/react'
import { DeleteIcon, EditIcon, ArrowBackIcon } from '@chakra-ui/icons' 
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function CustomerScreen({ onBack }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false)
  const [currentCustomerId, setCurrentCustomerId] = useState(null)

  const toast = useToast()

  // 1. Fetch Customers
  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      // 🛡️ SAFETY: We removed 'orderBy' temporarily to prevent index crashes
      const q = query(collection(db, "customers")) 
      const querySnapshot = await getDocs(q)
      const list = []
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      
      // Sort manually to be safe
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      
      setCustomers(list)
    } catch (error) {
      console.error("Fetch Error:", error)
      toast({ title: "Error loading customers", description: error.message, status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Helper: Open Modal for Adding
  const openAddModal = () => {
    setIsEditing(false)
    setName('')
    setPhone('')
    setLocation('')
    onOpen()
  }

  // Helper: Open Modal for Editing
  const openEditModal = (customer) => {
    setIsEditing(true)
    setCurrentCustomerId(customer.id)
    setName(customer.name || '')
    setPhone(customer.phone || '')
    setLocation(customer.location || '')
    onOpen()
  }

  // 2. Save (Add or Update)
  const handleSave = async () => {
    if (!name || !phone) {
      toast({ title: "Name and Phone are required", status: "warning" })
      return
    }

    try {
      if (isEditing) {
        // UPDATE Existing Customer
        const customerRef = doc(db, "customers", currentCustomerId)
        await updateDoc(customerRef, {
          name,
          phone,
          location: location || 'Dar es Salaam'
        })
        toast({ title: "Customer Updated! ✅", status: "success" })
      } else {
        // ADD New Customer
        await addDoc(collection(db, "customers"), {
          name,
          phone,
          location: location || 'Dar es Salaam',
          totalSpent: 0, 
          joinedDate: serverTimestamp()
        })
        toast({ title: "Customer Added! 🎉", status: "success" })
      }

      onClose()
      fetchCustomers() // Refresh list

    } catch (error) {
      console.error(error)
      toast({ title: "Error saving customer", status: "error" })
    }
  }

  // 3. Delete Customer
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return

    try {
      await deleteDoc(doc(db, "customers", id))
      toast({ title: "Customer Deleted", status: "info" })
      fetchCustomers()
    } catch (error) {
      toast({ title: "Error deleting customer", status: "error" })
    }
  }

  // 🛡️ SAFETY FUNCTION: Prevents crashes on bad numbers
  const safeCurrency = (val) => {
    if (typeof val === 'number') return val.toLocaleString()
    if (!val) return '0'
    // If it's a string like "10000", try to convert
    const num = Number(val)
    return isNaN(num) ? '0' : num.toLocaleString()
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <Button onClick={onBack} leftIcon={<ArrowBackIcon />} variant="ghost">Back</Button>
          <Heading size="md" color="blue.600">Customer Directory 👥</Heading>
        </HStack>
        <Button colorScheme="blue" onClick={openAddModal}>+ Add Customer</Button>
      </HStack>

      <Box bg="white" shadow="md" borderRadius="xl" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.100">
            <Tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Location</Th>
              <Th isNumeric>Total Spent</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {customers.map((cust) => (
              <Tr key={cust.id} _hover={{ bg: "gray.50" }}>
                <Td fontWeight="bold">{cust.name || 'Unknown'}</Td>
                <Td>{cust.phone || '-'}</Td>
                <Td>{cust.location || '-'}</Td>
                <Td isNumeric fontWeight="bold" color="green.600">
                  TZS {safeCurrency(cust.totalSpent)}
                </Td>
                <Td>
                  {Number(cust.totalSpent || 0) > 100000 ? (
                    <Badge colorScheme="purple">VIP 👑</Badge>
                  ) : (
                    <Badge colorScheme="gray">New</Badge>
                  )}
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <Tooltip label="Edit Customer">
                      <IconButton 
                        icon={<EditIcon />} 
                        size="sm" 
                        colorScheme="blue" 
                        variant="outline"
                        onClick={() => openEditModal(cust)}
                        aria-label="Edit"
                      />
                    </Tooltip>
                    <Tooltip label="Delete Customer">
                      <IconButton 
                        icon={<DeleteIcon />} 
                        size="sm" 
                        colorScheme="red" 
                        variant="outline"
                        onClick={() => handleDelete(cust.id)}
                        aria-label="Delete"
                      />
                    </Tooltip>
                  </HStack>
                </Td>
              </Tr>
            ))}
            {customers.length === 0 && (
              <Tr><Td colSpan={6} textAlign="center" py={10}>No customers yet. Add your first one!</Td></Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Add/Edit Customer Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditing ? "Edit Customer" : "Add New Customer"}</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Full Name</Text>
                <Input placeholder="e.g. Mama John" value={name} onChange={(e) => setName(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Phone Number</Text>
                <Input placeholder="e.g. 0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Location / Shop Name</Text>
                <Input placeholder="e.g. Kariakoo Market" value={location} onChange={(e) => setLocation(e.target.value)} />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleSave}>
              {isEditing ? "Update Customer" : "Save Customer"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}