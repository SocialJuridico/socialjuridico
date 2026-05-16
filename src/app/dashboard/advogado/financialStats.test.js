// Teste para validar a lógica de agregação financeira do Dashboard
// Mock simples da lógica que está no DashboardContext.js

function calculateFinancialStats(allFinanceRecords, currentMonth, currentYear) {
  const monthlyRecords = allFinanceRecords.filter(f => {
    if (!f.due_date) return false;
    const parts = f.due_date.split('-'); 
    if (parts.length < 2) return false;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; 
    return month === currentMonth && year === currentYear;
  });

  const previsto = monthlyRecords.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const recebido = monthlyRecords
    .filter(f => f.status === 'PAGO')
    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  return { previsto, recebido, count: monthlyRecords.length };
}

describe('Agregação Financeira do Dashboard', () => {
  const records = [
    { description: 'Maio - Pago', amount: 1500, status: 'PAGO', due_date: '2026-05-16' },
    { description: 'Maio - Pendente', amount: 500, status: 'PENDENTE', due_date: '2026-05-15' },
    { description: 'Junho - Futuro', amount: 1000, status: 'PENDENTE', due_date: '2026-06-01' },
    { description: 'Maio - Pago 2', amount: 500, status: 'PAGO', due_date: '2026-05-20' }
  ];

  test('Deve somar corretamente apenas os registros do mês atual (Maio 2026)', () => {
    const stats = calculateFinancialStats(records, 4, 2026); // 4 = Maio
    
    expect(stats.count).toBe(3); // 3 registros em maio
    expect(stats.previsto).toBe(2500); // 1500 + 500 + 500
    expect(stats.recebido).toBe(2000); // 1500 + 500 (Pagos)
  });

  test('Deve retornar zero se não houver registros no mês', () => {
    const stats = calculateFinancialStats(records, 0, 2026); // Janeiro
    expect(stats.count).toBe(0);
    expect(stats.previsto).toBe(0);
  });

  test('Deve lidar corretamente com datas em formato string sem shifting de fuso horário', () => {
    const recordsWithEdgeCase = [
        { amount: 100, status: 'PAGO', due_date: '2026-05-01' }
    ];
    // Se usasse new Date("2026-05-01"), em UTC-3 daria Abril (3)
    // Nosso novo parsing deve garantir Maio (4)
    const stats = calculateFinancialStats(recordsWithEdgeCase, 4, 2026);
    expect(stats.count).toBe(1);
  });
});
