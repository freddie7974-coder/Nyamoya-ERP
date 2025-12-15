// src/components/HRScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, VStack, Heading, HStack, Text, Input, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, SimpleGrid, Badge, useToast, FormControl, FormLabel } from '@chakra-ui/react'
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export default function HRScreen({ onBack }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  // New Employee Form
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [salary, setSalary] = useState('')

  const fetchEmployees = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "employees"))
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setEmployees(items)
      setLoading(false)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleAddEmployee = async () => {
    if (!name || !salary) return
    try {
      await addDoc(collection(db, "employees"), {
        name,
        role,
        salary: parseFloat(salary),
        joinedDate: serverTimestamp()
      })
      toast({ title: "Employee Added", status: "success" })
      setName(''); setRole(''); setSalary('')
      onClose()
      fetchEmployees()
    } catch (error) {
      toast({ title: "Error", status: "error" })
    }
  }

  const paySalary = async (emp) => {
    if (!confirm(`Confirm paying TZS ${emp.salary.toLocaleString()} to ${emp.name}?`)) return
    
    try {
      // Create Expense Entry Automatically
      await addDoc(collection(db, "expenses"), {
        description: `Salary: ${emp.name}`,
        amount: emp.salary,
        category: 'salary',
        date: serverTimestamp()
      })
      
      toast({ 
        title: "Salary Paid 💸", 
        description: "Recorded in Expenses automatically.", 
        status: "success" 
      })
    } catch (error) {
      toast({ title: "Error paying salary", status: "error" })
    }
  }

  return (
    <Box p={4} maxW="800px" mx="auto">
      <HStack justifyContent="space-between" mb={6}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md" color="cyan.700">HR Manager 👔</Heading>
        <Button colorScheme="cyan" size="sm" onClick={onOpen}>+ Add Staff</Button>
      </HStack>

      <SimpleGrid columns={[1, 2]} spacing={4}>
        {employees.map((emp) => (
          <Box key={emp.id} p={5} borderWidth="1px" borderRadius="xl" bg="white" shadow="sm">
            <HStack justify="space-between" mb={2}>
              <Heading size="md">{emp.name}</Heading>
              <Badge colorScheme="purple">{emp.role}</Badge>
            </HStack>
            <Text color="gray.600" mb={4}>Base Salary: TZS {emp.salary.toLocaleString()}</Text>
            
            <Button colorScheme="green" size="sm" width="100%" onClick={() => paySalary(emp)}>
              Pay Salary Now 💸
            </Button>
          </Box>
        ))}
      </SimpleGrid>

      {/* Modal: Add Employee */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Team Member</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input placeholder="e.g. Juma" value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Role</FormLabel>
                <Input placeholder="e.g. Sales / Production" value={role} onChange={(e) => setRole(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Salary (TZS)</FormLabel>
                <Input type="number" placeholder="e.g. 100000" value={salary} onChange={(e) => setSalary(e.target.value)} />
              </FormControl>
              <Button colorScheme="cyan" w="100%" onClick={handleAddEmployee}>Save Employee</Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}