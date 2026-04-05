'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Ticket, 
  PlusCircle, 
  Trash2, 
  Calendar, 
  Users, 
  ArrowLeft,
  Percent,
  Coins,
  ShieldCheck
} from 'lucide-react';
import styles from './Cupons.module.css';

export default function AdminCuponsPage() {
  const [cupons, setCupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    codigo: '',
    tipo: 'PLANO_PRO',
    desconto_tipo: 'PERCENTUAL',
    valor: '',
    limite_por_usuario: 1,
    expira_em: ''
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/cupons');
        const data = await res.json();
        if (active) {
          setCupons(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao buscar cupons:', error);
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false };
  }, []);

  async function fetchCupons() {
    try {
      const res = await fetch('/api/admin/cupons');
      const data = await res.json();
      setCupons(data);
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({
          codigo: '',
          tipo: 'PLANO_PRO',
          desconto_tipo: 'PERCENTUAL',
          valor: '',
          limite_por_usuario: 1,
          expira_em: ''
        });
        fetchCupons();
      }
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
    try {
      const res = await fetch(`/api/admin/cupons?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchCupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
           <ArrowLeft size={16} /> Voltar ao Painel Administrativo
        </Link>
        <h1><Ticket size={32} style={{ marginRight: 10, verticalAlign: 'middle' }} color="#d4af37" /> Gerenciamento de Cupons</h1>
        <p>Crie e gerencie ofertas exclusivas para advogados da plataforma.</p>
      </header>

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label>Código do Cupom</label>
            <input
              type="text"
              placeholder="EX: ADV20"
              className={styles.input}
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Aplicável em</label>
            <select
              className={styles.select}
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="PLANO_PRO">PLANO PRO</option>
              <option value="COMPRA_JURIS">COMPRA DE JURIS</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>Tipo Desconto</label>
            <select
              className={styles.select}
              value={formData.desconto_tipo}
              onChange={(e) => setFormData({ ...formData, desconto_tipo: e.target.value })}
            >
              <option value="PERCENTUAL">PORCENTUAL (%)</option>
              <option value="FIXO">VALOR FIXO (R$)</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>Valor Desconto</label>
            <input
              type="number"
              className={styles.input}
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              placeholder={formData.desconto_tipo === 'PERCENTUAL' ? 'Ex: 20' : 'Ex: 50.00'}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Limite/Advogado</label>
            <input
              type="number"
              className={styles.input}
              value={formData.limite_por_usuario}
              onChange={(e) => setFormData({ ...formData, limite_por_usuario: e.target.value })}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Expira em</label>
            <input
              type="date"
              className={styles.input}
              value={formData.expira_em}
              onChange={(e) => setFormData({ ...formData, expira_em: e.target.value })}
              required
            />
          </div>

          <button type="submit" className={styles.btnSubmit}>
            <PlusCircle size={18} /> Criar Cupom
          </button>
        </form>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo Aplicável</th>
                <th>Desconto</th>
                <th>Limites</th>
                <th>Expira em</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((cupom) => (
                <tr key={cupom.id} style={{ opacity: cupom.ativo ? 1 : 0.5 }}>
                  <td>
                    <span className={styles.couponCode}>{cupom.codigo}</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${cupom.tipo === 'PLANO_PRO' ? styles.badgePro : styles.badgeJuris}`}>
                      {cupom.tipo === 'PLANO_PRO' ? <ShieldCheck size={12} style={{ marginRight: 4 }} /> : <Coins size={12} style={{ marginRight: 4 }} />}
                      {cupom.tipo === 'PLANO_PRO' ? 'Plano Pro' : 'Juris'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        {cupom.desconto_tipo === 'PERCENTUAL' ? <Percent size={14} /> : 'R$'} 
                        {cupom.valor}{cupom.desconto_tipo === 'PERCENTUAL' ? '%' : ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={14} /> {cupom.limite_por_usuario} uso(s) por CPF
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} color="#64748b" /> {new Date(cupom.expira_em).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => handleDelete(cupom.id)} className={styles.btnDelete} title="Excluir Cupom">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {cupons.length === 0 && !loading && (
                <tr>
                  <td colSpan="6">
                    <div className={styles.emptyState}>
                        <Ticket size={48} style={{ opacity: 0.1, marginBottom: 15 }} />
                        <p>Nenhum cupom ativo no momento.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
