const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting admin user creation script...');
  const email = 'admin';
  const password = 'admin';
  
  if(!email || !password) {
    throw new Error('Please provide email and password');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
    console.log(`✅ Admin user created successfully with email: ${email}`);
  } else {
    console.log('ℹ️ Admin user with this email already exists.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('Script finished. Disconnecting from database...');
    await prisma.$disconnect();
  });
