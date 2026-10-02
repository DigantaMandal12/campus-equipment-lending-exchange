// ==============================================================================
// Fallback Academic Equipment Dataset
// Used when MongoDB is running in offline / in-memory development mode
// Prevents buffering timeouts and provides an immediate functional experience
// ==============================================================================

const FALLBACK_EQUIPMENT = [
  {
    _id: '66ff00000000000000000001',
    title: 'Omega Rotary Engineering Mini Drafter',
    description: 'Precision engineering mini drafter with steel rod, clamp, and dual protractor scales. Ideal for 1st & 2nd year Engineering Graphics and Drawing lab sheets.',
    category: 'Mechanical & Tools',
    department: 'Mechanical Engineering',
    condition: 'Like New',
    status: 'AVAILABLE',
    depositAmount: 350,
    dailyFee: 20,
    owner: {
      _id: '66ff00000000000000000099',
      name: 'Aniket Sharma',
      email: 'aniket.senior@campus.edu',
      department: 'Mechanical Engineering',
      phone: '9876543210',
      upiId: 'aniket.sharma@okicici'
    },
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    serialNumber: 'MD-2024-ENG-08',
    location: 'Mechanical Dept 2nd Floor Counter (Room 208)',
    averageRating: 4.9,
    ratingsCount: 14,
    createdAt: new Date('2026-09-15')
  },
  {
    _id: '66ff00000000000000000002',
    title: 'Casio fx-991EX ClassWiz Scientific Calculator',
    description: 'Natural textbook display with 552 mathematical functions, matrix, equation, and spreadsheet solver. Approved for college semester and gate examinations.',
    category: 'Calculators',
    department: 'Mathematics',
    condition: 'Brand New',
    status: 'AVAILABLE',
    depositAmount: 500,
    dailyFee: 25,
    owner: {
      _id: '66ff00000000000000000098',
      name: 'Priya Mukherjee',
      email: 'priya.math@campus.edu',
      department: 'Computer Science',
      phone: '9830123456',
      upiId: 'priya.m@okhdfcbank'
    },
    imageUrl: 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?w=600&auto=format&fit=crop&q=80',
    serialNumber: 'CALC-991EX-102',
    location: 'Central Library 1st Floor Reference Desk',
    averageRating: 5.0,
    ratingsCount: 22,
    createdAt: new Date('2026-09-18')
  },
  {
    _id: '66ff00000000000000000003',
    title: 'Mastech MAS830L Digital Multimeter with Probes',
    description: 'Compact pocket multimeter for measuring DC/AC voltage, DC current, resistance, diode check, and continuity beeper with backlight LCD. Essential for Basic Electrical (BEE) and Electronics lab work.',
    category: 'Electronics',
    department: 'Electrical & Electronics',
    condition: 'Good',
    status: 'AVAILABLE',
    depositAmount: 300,
    dailyFee: 15,
    owner: {
      _id: '66ff00000000000000000097',
      name: 'Rohan Ghosh',
      email: 'rohan.ee@campus.edu',
      department: 'Electrical & Electronics',
      phone: '9871122334',
      upiId: 'rohan.ee@icici'
    },
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
    serialNumber: 'DMM-830L-44',
    location: 'Electrical Machines Lab Room 304',
    averageRating: 4.8,
    ratingsCount: 9,
    createdAt: new Date('2026-09-20')
  },
  {
    _id: '66ff00000000000000000004',
    title: 'Arduino Uno R3 Starter Kit with Sensor Bundle',
    description: 'Complete microcontroller development kit including Arduino Uno, breadboard, jumper wires, ultrasonic sensor, IR module, servo motor, and 16x2 LCD display.',
    category: 'Electronics',
    department: 'Computer Science',
    condition: 'Like New',
    status: 'AVAILABLE',
    depositAmount: 600,
    dailyFee: 30,
    owner: {
      _id: '66ff00000000000000000096',
      name: 'Debjit Das',
      email: 'debjit.cs@campus.edu',
      department: 'Computer Science',
      phone: '9804567890',
      upiId: 'debjit.iot@paytm'
    },
    imageUrl: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600&auto=format&fit=crop&q=80',
    serialNumber: 'ARD-UNO-R3-51',
    location: 'Computer Science Software Lab 1',
    averageRating: 4.9,
    ratingsCount: 18,
    createdAt: new Date('2026-09-22')
  },
  {
    _id: '66ff00000000000000000005',
    title: 'Chemistry Lab Glassware Kit & 100% Cotton Lab Coat',
    description: 'Standard student laboratory coat (Unisex Size L) with set of borosilicate beakers (100ml, 250ml), graduated measuring cylinder, and safety goggles.',
    category: 'Lab Equipment',
    department: 'Physics & Chemistry',
    condition: 'Good',
    status: 'AVAILABLE',
    depositAmount: 250,
    dailyFee: 10,
    owner: {
      _id: '66ff00000000000000000095',
      name: 'Sneha Roy',
      email: 'sneha.biotech@campus.edu',
      department: 'Biotechnology',
      phone: '9836789012',
      upiId: 'sneha.biotech@okaxis'
    },
    imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&auto=format&fit=crop&q=80',
    serialNumber: 'CHEM-COAT-09',
    location: 'Chemistry Department Main Store (Room 102)',
    averageRating: 4.7,
    ratingsCount: 11,
    createdAt: new Date('2026-09-25')
  },
  {
    _id: '66ff00000000000000000006',
    title: 'Lenovo ThinkPad Core i5 (For Final Year Seminars)',
    description: 'High-performance laptop with Intel Core i5, 16GB RAM, HDMI output, and pre-loaded MATLAB and AutoCAD viewers for project presentations.',
    category: 'Laptops & Tablets',
    department: 'Computer Science',
    condition: 'Good',
    status: 'AVAILABLE',
    depositAmount: 2500,
    dailyFee: 120,
    owner: {
      _id: '66ff00000000000000000094',
      name: 'Arindam Bose',
      email: 'arindam.bose@campus.edu',
      department: 'Computer Science',
      phone: '9831998877',
      upiId: 'arindam.tech@icici'
    },
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80',
    serialNumber: 'TP-L580-CS-03',
    location: 'Student Activity Centre (SAC) Helpdesk',
    averageRating: 5.0,
    ratingsCount: 8,
    createdAt: new Date('2026-09-28')
  }
];

function getFallbackEquipment() {
  return JSON.parse(JSON.stringify(FALLBACK_EQUIPMENT));
}

function getFallbackEquipmentById(id) {
  const all = getFallbackEquipment();
  return all.find(item => String(item._id) === String(id)) || null;
}

function filterFallbackEquipment(q, category, department, availability) {
  let list = getFallbackEquipment();

  if (q && q.trim()) {
    const cleanQ = q.trim().toLowerCase();
    list = list.filter(item => 
      (item.title && item.title.toLowerCase().includes(cleanQ)) ||
      (item.description && item.description.toLowerCase().includes(cleanQ)) ||
      (item.category && item.category.toLowerCase().includes(cleanQ)) ||
      (item.department && item.department.toLowerCase().includes(cleanQ))
    );
  }

  if (category && category !== 'ALL') {
    list = list.filter(item => item.category === category);
  }

  if (department && department !== 'ALL') {
    list = list.filter(item => item.department === department);
  }

  if (availability === 'AVAILABLE') {
    list = list.filter(item => item.status === 'AVAILABLE');
  } else if (availability === 'UNAVAILABLE') {
    list = list.filter(item => item.status !== 'AVAILABLE');
  }

  return list;
}

module.exports = {
  FALLBACK_EQUIPMENT,
  getFallbackEquipment,
  getFallbackEquipmentById,
  filterFallbackEquipment
};