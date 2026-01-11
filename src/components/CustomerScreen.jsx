import { useState, useEffect } from 'react'
import {
  Box, Button, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Input, VStack, HStack, IconButton, useToast, Spinner,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, FormControl,
  FormLabel, Avatar, Text, Badge, Card, CardBody, InputGroup, InputLeftElement
} from '@chakra-ui/react'
import { ArrowBackIcon, DeleteIcon, AddIcon, SearchIcon, PhoneIcon, EmailIcon } from '@chakra-ui/icons'
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export default function CustomersScreen({ onBack }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')

  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'customers'), orderBy('name', 'asc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setCustomers(data)
    } catch (error) {
      console.error("Error loading customers:", error)
      toast({ title: "Error loading data", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomer = async () => {
    if (!name || !phone) {
      toast({ title: "Name and Phone are required", status: "warning" })
      return
    }
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'customers'), {
        name,
        phone,
        email,
        address,
        createdAt: serverTimestamp(),
        totalPurchases: 0 // You can link this to sales later!
      })
      toast({ title: "Customer Added!", status: "success" })
      onClose()
      clearForm()
      fetchCustomers()
    } catch (error) {
      console.error(error)
      toast({ title: "Error saving", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return
    try {
      await deleteDoc(doc(db, 'customers', id))
      setCustomers(customers.filter(c => c.id !== id))
      toast({ title: "Deleted", status: "info" })
    } catch (error) {
      console.error(error)
    }
  }

  const clearForm = () => {
    setName('')
    setPhone('')
    setEmail('')
    setAddress('')
  }

  // Filter Logic
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  return (
    <Box p={5} maxW="1200px" mx="auto">
      {/* HEADER */}
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <IconButton icon={<ArrowBackIcon />} onClick={onBack} variant="ghost" aria-label="Back" />
          <Heading size="lg" color="cyan.700">Customer CRM 🤝</Heading>
        </HStack>
        <Button leftIcon={<AddIcon />} colorScheme="cyan" onClick={onOpen}>
          Add Customer
        </Button>
      </HStack>

      {/* SEARCH BAR */}
      <Card mb={6} variant="outline">
        <CardBody py={4}>
          <InputGroup>
            <InputLeftElement pointerEvents="none"><SearchIcon color="gray.300" /></InputLeftElement>
            <Input 
              placeholder="Search by Name or Phone Number..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </InputGroup>
        </CardBody>
      </Card>

      {/* CUSTOMER LIST */}
      {loading ? (
        <Spinner size="xl" color="cyan.500" />
      ) : (
        <Box bg="white" shadow="sm" borderRadius="lg" overflowX="auto">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Customer</Th>
                <Th>Contact Info</Th>
                <Th>Location</Th>
                <Th>Since</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredCustomers.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <HStack>
                      <Avatar size="sm" name={c.name} bg="cyan.500" />
                      <Text fontWeight="bold">{c.name}</Text>
                    </HStack>
                  </Td>
                  <Td>
                    <VStack align="start" spacing={1}>
                      <HStack><Icon as={PhoneIcon} color="gray.400" /><Text fontSize="sm">{c.phone}</Text></HStack>
                      {c.email && <HStack><Icon as={EmailIcon} color="gray.400" /><Text fontSize="sm">{c.email}</Text></HStack>}
                    </VStack>
                  </Td>
                  <Td>{c.address || '-'}</Td>
                  <Td fontSize="sm" color="gray.500">
                    {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : 'Old Entry'}
                  </Td>
                  <Td>
                    <IconButton 
                      icon={<DeleteIcon />} 
                      size="sm" 
                      colorScheme="red" 
                      variant="ghost" 
                      onClick={() => handleDelete(c.id)}
                    />
                  </Td>
                </Tr>
              ))}
              {filteredCustomers.length === 0 && (
                <Tr>
                  <Td colSpan={5} textAlign="center" py={10} color="gray.500">
                    No customers found.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* ADD CUSTOMER MODAL */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Customer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Phone Number</FormLabel>
                <Input type="tel" placeholder="07..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Email (Optional)</FormLabel>
                <Input type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Address / Location</FormLabel>
                <Input placeholder="e.g. Town Center, Shop 4" value={address} onChange={(e) => setAddress(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="cyan" onClick={handleAddCustomer} isLoading={isSubmitting}>
              Save Customer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  )
}