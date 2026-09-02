import bcrypt from 'bcryptjs'

const password = 'admin123'
const hash = await bcrypt.hash(password, 10)

console.log('\n=== User Creation SQL ===\n')
console.log(`INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)`)
console.log(`VALUES (`)
console.log(`  '${crypto.randomUUID()}',`)
console.log(`  'Admin User',`)
console.log(`  'admin@example.com',`)
console.log(`  '${hash}',`)
console.log(`  'ADMIN',`)
console.log(`  true,`)
console.log(`  NOW(),`)
console.log(`  NOW()`)
console.log(`);`)
console.log('\n=== Login Credentials ===')
console.log('Email: admin@example.com')
console.log('Password: admin123')
console.log('\n')
