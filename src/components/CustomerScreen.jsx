// src/components/CustomerScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Table, Thead, Tbody, Tr, Th, Td, Heading, HStack, Input, useToast, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, VStack, Text, Badge } from '@chakra-ui/react'
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function CustomerScreen({ onBack }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')

  const toast = useToast()

  // 1. Fetch Customers
  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const q = query(collection(db, "customers"), orderBy("name"))
      const querySnapshot = await getDocs(q)
      const list = []
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setCustomers(list)
    } catch (error) {
      toast({ title: "Error loading customers", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 2. Add New Customer
  const handleAddCustomer = async () => {
    if (!name || !phone) {
      toast({ title: "Name and Phone are required", status: "warning" })
      return
    }

    try {
      await addDoc(collection(db, "customers"), {
        name,
        phone,
        location: location || 'Dar es Salaam',
        totalSpent: 0, // We will track this later!
        joinedDate: serverTimestamp()
      })

      toast({ title: "Customer Added! 🎉", status: "success" })
      setName('')
      setPhone('')
      setLocation('')
      onClose()
      fetchCustomers() // Refresh list

    } catch (error) {
      console.error(error)
      toast({ title: "Error adding customer", status: "error" })
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <Button onClick={onBack} variant="ghost">← Back</Button>
          <Heading size="md" color="blue.600">Customer Directory 👥</Heading>
        </HStack>
        <Button colorScheme="blue" onClick={onOpen}>+ Add Customer</Button>
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
            </Tr>
          </Thead>
          <Tbody>
            {customers.map((cust) => (
              <Tr key={cust.id} _hover={{ bg: "gray.50" }}>
                <Td fontWeight="bold">{cust.name}</Td>
                <Td>{cust.phone}</Td>
                <Td>{cust.location}</Td>
                <Td isNumeric fontWeight="bold" color="green.600">
                  TZS {(cust.totalSpent || 0).toLocaleString()}
                </Td>
                <Td>
                  {/* Simple Logic: VIP if spent > 100k */}
                  {(cust.totalSpent || 0) > 100000 ? (
                    <Badge colorScheme="purple">VIP 👑</Badge>
                  ) : (
                    <Badge colorScheme="gray">New</Badge>
                  )}
                </Td>
              </Tr>
            ))}
            {customers.length === 0 && (
              <Tr><Td colSpan={5} textAlign="center" py={10}>No customers yet. Add your first one!</Td></Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Add Customer Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Customer</ModalHeader>
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
            <Button colorScheme="blue" onClick={handleAddCustomer}>Save Customer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}