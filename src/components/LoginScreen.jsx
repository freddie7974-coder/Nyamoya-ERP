// src/components/LoginScreen.jsx
import { useState } from 'react'
import { Box, Button, VStack, Heading, Text, Input, useToast, Container, Alert, AlertIcon, Divider } from '@chakra-ui/react'
// ✅ IMPORTED: signInWithEmailAndPassword
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, googleProvider, db } from '../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  // 1. HELPER: Check Database for Role
  const checkUserRole = async (userEmail) => {
    // ✅ FIXED: Now checks "allowed_users" to match HR Screen
    const q = query(collection(db, "allowed_users"), where("email", "==", userEmail))
    const querySnapshot = await getDocs(q)

    // Backdoor for YOU (The Boss)
    if (userEmail === "freddie7974@gmail.com") { // <--- Make sure this matches your email exactly
       onLogin('admin')
       return true
    }

    if (querySnapshot.empty) {
      setError("Access Denied: You are not authorized staff.")
      await auth.signOut()
      return false
    }

    const userData = querySnapshot.docs[0].data()
    if (userData.role === 'admin') {
      onLogin('admin')
    } else {
      onLogin('staff')
    }
    toast({ title: "Welcome back!", status: "success" })
    return true
  }

  // 2. GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const userEmail = result.user.email
      await checkUserRole(userEmail)
    } catch (err) {
      console.error(err)
      setError("Google Login Failed.")
    } finally {
      setLoading(false)
    }
  }

  // 3. EMAIL/PASSWORD LOGIN (Now Real!)
  const handleEmailLogin = async () => {
    if (!email || !password) {
        setError("Please enter both email and password.")
        return
    }

    setLoading(true)
    setError('')
    try {
      // A. Check Firebase Auth (Is the password correct?)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const userEmail = userCredential.user.email

      // B. Check Firestore (Is this person allowed?)
      await checkUserRole(userEmail)
      
    } catch (err) {
      console.error(err)
      // Make error messages user-friendly
      if (err.code === 'auth/wrong-password') {
        setError("Incorrect password.")
      } else if (err.code === 'auth/user-not-found') {
        setError("No user found with this email.")
      } else {
        setError("Login Failed: " + err.message)
      }
    } finally {
      setLoading(false)
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

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Email/Pass Login */}
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
          
          <Button colorScheme="teal" width="100%" onClick={handleEmailLogin} isLoading={loading}>
            Login
          </Button>

          <HStack w="100%">
            <Divider />
            <Text fontSize="xs" color="gray.400">OR</Text>
            <Divider />
          </HStack>

          {/* Google Login */}
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