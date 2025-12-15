// src/components/DeliveryScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, VStack, Heading, FormControl, FormLabel, Input, HStack, Text, Badge, useToast, Spinner, SimpleGrid, IconButton } from '@chakra-ui/react'
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export default function DeliveryScreen({ onBack }) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form State
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [details, setDetails] = useState('') // e.g. "2 Smooth, 1 Crunchy"
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const toast = useToast()

  // 1. Fetch Deliveries
  const fetchDeliveries = async () => {
    setLoading(true)
    try {
      // Get all deliveries, sorted by date
      const q = query(collection(db, "deliveries"), orderBy("date", "desc"))
      const querySnapshot = await getDocs(q)
      const items = []
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      setDeliveries(items)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeliveries()
  }, [])

  // 2. Add New Delivery
  const handleAddDelivery = async () => {
    if (!customer || !location || !details) {
      toast({ title: "Please fill in details", status: "warning" })
      return
    }

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "deliveries"), {
        customer,
        phone,
        location,
        details,
        status: 'pending', // Default status
        date: serverTimestamp()
      })
      
      toast({ title: "Order Scheduled! 🚚", status: "success" })
      setCustomer('')
      setPhone('')
      setLocation('')
      setDetails('')
      fetchDeliveries() // Refresh list
    } catch (error) {
      toast({ title: "Error saving", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. Mark as Delivered
  const markDelivered = async (id) => {
    try {
      const ref = doc(db, "deliveries", id)
      await updateDoc(ref, { status: 'delivered' })
      toast({ title: "Marked as Delivered ✅", status: "success" })
      fetchDeliveries()
    } catch (error) {
      toast({ title: "Error updating", status: "error" })
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner /></Box>

  return (
    <Box p={4} maxW="600px" mx="auto">
      <HStack mb={6}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md" color="purple.600">Delivery Tracker</Heading>
      </HStack>

      {/* Input Form */}
      <Box p={5} borderWidth="1px" borderRadius="lg" bg="white" shadow="sm" mb={8}>
        <Heading size="sm" mb={4}>Schedule New Delivery</Heading>
        <VStack spacing={3}>
          <Input placeholder="Customer Name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          <Input placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Location (e.g. Kariakoo)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input placeholder="Order Details (e.g. 5kg Bucket)" value={details} onChange={(e) => setDetails(e.target.value)} />
          <Button colorScheme="purple" w="100%" onClick={handleAddDelivery} isLoading={isSubmitting}>
            Add to Schedule 📅
          </Button>
        </VStack>
      </Box>

      {/* Delivery List */}
      <Heading size="sm" mb={4}>Active Orders</Heading>
      
      {deliveries.length === 0 && <Text color="gray.500">No deliveries found.</Text>}

      <VStack spacing={4} align="stretch">
        {deliveries.map((item) => (
          <Box key={item.id} p={4} borderWidth="1px" borderRadius="lg" bg={item.status === 'pending' ? "white" : "gray.50"} opacity={item.status === 'delivered' ? 0.7 : 1}>
            <HStack justifyContent="space-between" align="start">
              <VStack align="start" spacing={1}>
                <Heading size="xs">{item.customer} <Text as="span" color="gray.500" fontWeight="normal">({item.phone})</Text></Heading>
                <Text fontSize="sm" fontWeight="bold" color="purple.700">📍 {item.location}</Text>
                <Text fontSize="sm">📦 {item.details}</Text>
              </VStack>
              
              <VStack>
                <Badge colorScheme={item.status === 'pending' ? 'orange' : 'green'}>{item.status}</Badge>
                
                {item.status === 'pending' && (
                  <Button size="xs" colorScheme="green" onClick={() => markDelivered(item.id)}>
                    Mark Done ✓
                  </Button>
                )}
              </VStack>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}