// src/components/LoginScreen.jsx
import { useState } from 'react'
import { Box, Button, VStack, Heading, Text, useToast, Container, Center, Icon } from '@chakra-ui/react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  // 🛡️ SECURITY CHECK
  // Replace this with the EXACT email you use for your Google Account
  const ADMIN_EMAIL = "freddie7974@gmail.com" // 👈 CHANGE THIS TO YOUR EMAIL!

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // 1. Pop up the Google Window
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      // 2. Check who just logged in
      let role = 'staff'
      
      // If the email matches YOURS, you are Admin.
      if (user.email === ADMIN_EMAIL) {
        role = 'admin'
        toast({ title: `Welcome Boss! 👑`, status: "success" })
      } else {
        toast({ title: `Welcome Staff (${user.displayName})`, status: "success" })
      }

      // 3. Enter the App
      onLogin(role)

    } catch (error) {
      console.error(error)
      toast({ title: "Login Failed", description: error.message, status: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box h="100vh" bgGradient="linear(to-br, teal.500, blue.600)" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm" bg="white" p={10} borderRadius="2xl" shadow="2xl" textAlign="center">
        <VStack spacing={8}>
          
          <Box>
            <Heading size="xl" color="gray.800" mb={2}>Nyamoya ERP</Heading>
            <Text color="gray.500" fontSize="lg">Enterprise Login</Text>
          </Box>

          <Center w="100%">
            <Button 
              w="100%" 
              h="60px"
              variant="outline" 
              colorScheme="blue"
              isLoading={loading}
              loadingText="Connecting..."
              onClick={handleGoogleLogin}
              leftIcon={<Text fontSize="2xl">G</Text>} // Simple Google Icon representation
              _hover={{ bg: 'blue.50', transform: 'scale(1.02)' }}
              transition="all 0.2s"
              fontSize="lg"
            >
              Sign in with Google
            </Button>
          </Center>

          <Text fontSize="xs" color="gray.400">
            Authorized Personnel Only
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}