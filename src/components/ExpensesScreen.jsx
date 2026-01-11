// src/components/ExpensesScreen.jsx
import { useState, useEffect } from 'react'
import {
  Box, Button, VStack, HStack, Heading, Text, Input, Select,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, useToast,
  Card, CardBody, FormControl, FormLabel, Spinner, Badge,
  TableContainer, Divider, Icon
} from '@chakra-ui/react'
import { DeleteIcon, ArrowBackIcon, AddIcon } from '@chakra-ui/icons'
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export default function ExpensesScreen({ onBack }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form State
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Operating') 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]) 
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toast = useToast()

  // 🛡️ SAFETY: Handles any date format (Timestamp or String)
  const formatExpenseDate = (dateVal) => {
    if (!dateVal) return '-'
    if (dateVal && typeof dateVal.seconds === 'number') {
      return new Date(dateVal.seconds * 1000).toLocaleDateString()
    }
    if (dateVal instanceof Date) return dateVal.toLocaleDateString()
    return String(dateVal)
  }

  // 🎨 Color Coder for Categories
  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'Raw Materials': return 'green'
      case 'Salary': return 'purple'
      case 'Transport': return 'blue'
      case 'Utilities': return 'orange'
      case 'Rent': return 'red'
      case 'Marketing': return 'pink'
      case 'Packaging': return 'yellow'
      case 'Wastage': return 'gray'
      default: return 'teal'
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setExpenses(data)
    } catch (error) {
      console.error("Error loading expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async () => {
    if (!amount || !description) {
      toast({ title: "Please fill in amount and description", status: "warning" })
      return
    }
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'expenses'), {
        amount: Number(amount),
        description: String(description),
        category,
        date, 
        timestamp: serverTimestamp(),
        type: 'expense'
      })
      toast({ title: "Expense Recorded!", status: "success" })
      setAmount('')
      setDescription('')
      fetchExpenses()
    } catch (error) {
      console.error(error)
      toast({ title: "Error saving", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure you want to delete this expense?")) return
    try {
      await deleteDoc(doc(db, 'expenses', id))
      setExpenses(expenses.filter(e => e.id !== id))
      toast({ title: "Deleted", status: "info" })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Box p={5} maxW="1200px" mx="auto">
      {/* HEADER */}
      <HStack mb={6} justifyContent="space-between">
        <HStack>
          <IconButton 
            icon={<ArrowBackIcon />} 
            onClick={onBack} 
            variant="ghost" 
            aria-label="Back" 
          />
          <Heading size="lg" color="red.700">Expense Tracker 💸</Heading>
        </HStack>
        <Badge fontSize="1em" colorScheme="red" p={2} borderRadius="md">
          Total: {expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toLocaleString()}
        </Badge>
      </HStack>

      <HStack alignItems="flex-start" spacing={8} flexDirection={{ base: 'column', lg: 'row' }}>
        
        {/* LEFT: INPUT FORM */}
        <Card w={{ base: "100%", lg: "35%" }} variant="elevated" shadow="lg">
          <CardBody>
            <VStack spacing={5} align="stretch">
              <Heading size="md" color="gray.600">New Expense</Heading>
              
              <FormControl isRequired>
                <FormLabel>Category</FormLabel>
                <Select value={category} onChange={(e)=>setCategory(e.target.value)} focusBorderColor="red.500">
                    <option value="Operating">Operating</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Salary">Salary</option>
                    <option value="Transport">Transport</option>
                    <option value="Utilities">Utilities (Water/Power)</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Rent">Rent</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Wastage">Wastage / Damages</option>
                    <option value="Other">Other</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Input 
                  placeholder="e.g. Fuel for delivery truck" 
                  value={description} 
                  onChange={(e)=>setDescription(e.target.value)}
                  focusBorderColor="red.500"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Amount</FormLabel>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e)=>setAmount(e.target.value)}
                  focusBorderColor="red.500"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input type="date" value={date} onChange={(e)=>setDate(e.target.value)}/>
              </FormControl>

              <Button 
                leftIcon={<AddIcon />} 
                colorScheme="red" 
                size="lg" 
                w="100%" 
                onClick={handleAddExpense} 
                isLoading={isSubmitting}
                mt={2}
              >
                Record Expense
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* RIGHT: HISTORY TABLE */}
        <Box w={{ base: "100%", lg: "65%" }} bg="white" p={4} borderRadius="xl" shadow="sm" border="1px solid" borderColor="gray.100">
          <Heading size="md" mb={4} color="gray.600">History</Heading>
          
          {loading ? (
            <VStack py={10}><Spinner size="xl" color="red.500" /></VStack>
          ) : (
            <TableContainer>
              <Table variant="simple" size="md">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Date</Th>
                    <Th>Details</Th>
                    <Th isNumeric>Cost</Th>
                    <Th width="50px"></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {expenses.map((exp) => (
                    <Tr key={exp.id} _hover={{ bg: "gray.50" }}>
                      <Td fontSize="sm" color="gray.500">{formatExpenseDate(exp.date)}</Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" fontSize="sm">{exp.description}</Text>
                          <Badge colorScheme={getCategoryColor(exp.category)} fontSize="xs">
                            {exp.category}
                          </Badge>
                        </VStack>
                      </Td>
                      <Td isNumeric fontWeight="bold" color="red.600">
                        {Number(exp.amount).toLocaleString()}
                      </Td>
                      <Td>
                        <IconButton 
                          icon={<DeleteIcon />} 
                          size="sm" 
                          colorScheme="red" 
                          variant="ghost" 
                          onClick={() => handleDelete(exp.id)}
                          aria-label="Delete"
                        />
                      </Td>
                    </Tr>
                  ))}
                  {expenses.length === 0 && (
                    <Tr>
                      <Td colSpan={4} textAlign="center" py={10} color="gray.400">
                        No expenses recorded yet.
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </HStack>
    </Box>
  )
}