// src/components/LoginScreen.jsx
import { useState } from 'react'
import { Box, Button, VStack, Heading, Text, Input, useToast, Container, Alert, AlertIcon } from '@chakra-ui/react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider, db } from '../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('') // (Optional: For future use)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const toast = useToast()

  // 🔐 SECURE GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 1. Ask Google who this is
      const result = await signInWithPopup(auth, googleProvider)
      const googleEmail = result.user.email

      // 🛑 2. SECURITY CHECK: Is this email in our database?
      // We check the "users" collection (where HR adds staff)
      const q = query(collection(db, "users"), where("email", "==", googleEmail))
      const querySnapshot = await getDocs(q)

      // A. Special Backdoor for YOU (The Boss) to set up the system first
      // Change this to your EXACT email
      if (googleEmail === "freddie7974@gmail.com") {
        onLogin('admin')
        return
      }

      // B. If email NOT found in database -> BLOCK THEM 🚫
      if (querySnapshot.empty) {
        setError("Access Denied: You are not authorized staff.")
        await auth.signOut() // Kick them out immediately
        setLoading(false)
        return
      }

      // C. If Found -> Check Role
      const userData = querySnapshot.docs[0].data()
      
      if (userData.role === 'admin') {
        onLogin('admin')
      } else {
        onLogin('staff')
      }
      
      toast({ title: "Welcome back!", status: "success" })

    } catch (err) {
      console.error(err)
      setError("Login Failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // (Optional: Keep the simple manual login for testing if you want, or remove it)
  const handleManualLogin = () => {
    if (email === 'admin' && password === 'admin') {
      onLogin('admin')
    } else if (email === 'staff' && password === '1234') {
      onLogin('staff')
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <Box minH="100vh" bgGradient="linear(to-b, teal.500, gray.100)" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="md" bg="white" p={8} borderRadius="xl" boxShadow="2xl">
        <VStack spacing={6}>
          <Box textAlign="center">
            <Heading color="teal.600" mb={2}>Nyamoya ERP</Heading>
            <Text color="gray.500">Secure Enterprise Login</Text>
          </Box>

          {/* Error Message Area */}
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Simple Inputs (Optional, can be removed if you only want Google) */}
          <Input 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <Input 
            placeholder="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />

          <Button colorScheme="teal" width="100%" onClick={handleManualLogin}>
            Login
          </Button>
          
          <Text fontSize="sm" color="gray.400">OR</Text>

          {/* 👇 GOOGLE BUTTON */}
          <Button 
            width="100%" 
            variant="outline" 
            colorScheme="blue" 
            isLoading={loading}
            onClick={handleGoogleLogin}
            leftIcon={<Text fontWeight="bold" fontSize="lg">G</Text>}
          >
            Sign in with Google
          </Button>

        </VStack>
      </Container>
    </Box>
  )
}