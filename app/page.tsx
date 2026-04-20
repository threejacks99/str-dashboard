import { supabase } from '../lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('clients').select('*')

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>STR Analytics Dashboard</h1>
      <p>Database connection test:</p>
      {error ? (
        <p style={{ color: 'red' }}>Error: {error.message}</p>
      ) : (
        <p style={{ color: 'green' }}>Connected! Clients in database: {data.length}</p>
      )}
    </main>
  )
}