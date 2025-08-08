import { useAuth } from '../context/AuthContext'

export default function TestLogin() {
  const { user, loading } = useAuth()
  if (loading) return <p>Loading...</p>

  return (
    <div style={{
      padding: '2rem',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    }}>
      <h1>✅ Test Login Page</h1>
      {user ? (
        <p>Welcome, {user.email}</p>
      ) : (
        <p>You're not logged in.</p>
      )}
    </div>
  )
}
