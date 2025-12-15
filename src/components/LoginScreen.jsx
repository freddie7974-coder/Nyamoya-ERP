// src/components/LoginScreen.jsx
import { useState } from 'react'
import { Box, Button, VStack, Heading, Input, Text, useToast, Spinner } from '@chakra-ui/react'
import { signInAnonymously } from "firebase/auth" // 👈 Import Sign In
import { auth } from '../firebase' // 👈 Import the Auth Service
import { logAction } from '../utils/logger'

export default function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleLogin = async () => {
    setLoading(true)
    
    // 1. Check PIN (Frontend Security)
    if (pin === '2025') {
      try {
        // 2. Sign In to Firebase (Backend Security) 🔐
        await signInAnonymously(auth)
        onLogin('admin')
      } catch (error) {
        toast({ title: "Connection Error", description: "Could not verify security token.", status: "error" })
      }
    } 
    else if (pin === '1234') {
      try {
        await signInAnonymously(auth)
        logAction('Staff', 'Login', 'Access granted via PIN 1234')
        onLogin('staff')
      } catch (error) {
        toast({ title: "Connection Error", status: "error" })
      }
    } 
    else {
      toast({ title: "Access Denied", status: "error" })
      setPin('')
    }
    setLoading(false)
  }

  return (
    <Box h="100vh" display="flex" alignItems="center" justifyContent="center" bgGradient="linear(to-br, purple.600, blue.500)">
      <Box p={8} bg="white" borderRadius="xl" boxShadow="2xl" width="300px" textAlign="center">
        <Heading mb={6} size="lg" color="gray.700">Nyamoya ERP</Heading>
        <Text mb={4} color="gray.500">Enter Security PIN</Text>
        
        <VStack spacing={4}>
          <Input 
            type="password" 
            placeholder="****" 
            textAlign="center" 
            fontSize="2xl" 
            letterSpacing="widest"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          <Button 
            colorScheme="purple" 
            width="100%" 
            onClick={handleLogin}
            isLoading={loading}
          >
            Unlock System 🔓
          </Button>
        </VStack>
      </Box>
    </Box>
  )
}