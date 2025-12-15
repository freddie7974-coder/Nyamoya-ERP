// src/components/HRScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Table, Thead, Tbody, Tr, Th, Td, Heading, HStack, Input, Select, useToast, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, VStack, Text, Badge, IconButton } from '@chakra-ui/react'
import { collection, getDocs, setDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function HRScreen({ onBack }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  // Form State
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')

  const toast = useToast()

  // 1. Fetch Authorized Users
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "allowed_users"))
      const list = []
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setUsers(list)
    } catch (error) {
      toast({ title: "Error loading staff list", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 2. Add New Employee 👤
  const handleAddUser = async () => {
    if (!email || !name) {
      toast({ title: "Email and Name are required", status: "warning" })
      return
    }

    try {
      // Use Email as the Document ID for easy lookup later
      await setDoc(doc(db, "allowed_users", email.toLowerCase()), {
        name,
        email: email.toLowerCase(),
        role,
        addedAt: serverTimestamp()
      })

      toast({ title: "Staff Member Added! ✅", status: "success" })
      setEmail('')
      setName('')
      setRole('staff')
      onClose()
      fetchUsers() 

    } catch (error) {
      console.error(error)
      toast({ title: "Error adding user", status: "error" })
    }
  }

  // 3. Fire Employee (Remove Access) 🚫
  const handleRemoveUser = async (userId) => {
    if (window.confirm("Are you sure you want to remove this user? They will lose access immediately.")) {
      try {
        await deleteDoc(doc(db, "allowed_users", userId))
        toast({ title: "User Removed", status: "info" })
        fetchUsers()
      } catch (error) {
        toast({ title: "Error removing user", status: "error" })
      }
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <Button onClick={onBack} variant="ghost">← Back</Button>
          <Heading size="md" color="pink.600">Staff & HR Manager 👥</Heading>
        </HStack>
        <Button colorScheme="pink" onClick={onOpen}>+ Add Staff</Button>
      </HStack>

      <Box bg="white" shadow="md" borderRadius="xl" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.100">
            <Tr>
              <Th>Name</Th>
              <Th>Email (Google Account)</Th>
              <Th>Role</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td fontWeight="bold">{user.name}</Td>
                <Td>{user.email}</Td>
                <Td>
                  <Badge colorScheme={user.role === 'admin' ? 'purple' : 'green'}>
                    {user.role.toUpperCase()}
                  </Badge>
                </Td>
                <Td>
                  <IconButton 
                    icon={<Text>🗑️</Text>} 
                    colorScheme="red" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRemoveUser(user.id)}
                    aria-label="Remove user"
                  />
                </Td>
              </Tr>
            ))}
            {users.length === 0 && (
              <Tr><Td colSpan={4} textAlign="center" py={10}>No staff added yet.</Td></Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Add Staff Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Authorize New Staff</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Staff Name</Text>
                <Input placeholder="e.g. Juma" value={name} onChange={(e) => setName(e.target.value)} />
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Google Email Address</Text>
                <Input placeholder="e.g. juma@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Text fontSize="xs" color="gray.500" mt={1}>They must use this exact email to log in.</Text>
              </Box>
              <Box w="100%">
                <Text mb={2} fontWeight="bold">Role</Text>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="staff">Staff (Sales & Production only)</option>
                  <option value="manager">Manager (Can see Reports)</option>
                  <option value="admin">Admin (Full Access)</option>
                </Select>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="pink" onClick={handleAddUser}>Authorize User</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}