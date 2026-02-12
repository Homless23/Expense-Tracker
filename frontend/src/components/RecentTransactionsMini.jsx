import React from 'react';
import { useGlobalContext } from '../context/globalContext';

const RecentTransactionsMini = () => {
  const { expenses } = useGlobalContext();
  const recent = expenses.slice(0, 4); // Show 4 items now

  // Helper: Get Icon based on Category
  const getIcon = (catName) => {
      const map = {
          'Food': '🍔', 'Transport': '🚕', 'Entertainment': '🎬', 
          'Bills': '💡', 'Health': '❤️', 'Shopping': '🛍️', 'Housing': '🏠'
      };
      return map[catName] || '💸'; // Default icon
  };

  return (
    <div className="card" style={{ 
        background: '#18181b', 
        border: '1px solid rgba(255,255,255,0.08)', 
        borderRadius: '24px',
        padding: '1.5rem',
        height: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Activity</h3>
      </div>

      {recent.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💤</div>
            No transactions yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {recent.map((item, index) => (
            <div key={item._id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem 0', 
                borderBottom: index === recent.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' 
            }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* ICON BOX */}
                <div style={{ 
                    width: '40px', height: '40px', borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.03)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '1.2rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                   {getIcon(item.category)}
                </div>
                
                {/* TEXT INFO */}
                <div>
                   <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '500' }}>{item.title}</div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                       {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {item.category}
                   </div>
                </div>
              </div>

              {/* AMOUNT */}
              <span style={{ fontWeight: '600', color: '#fff', fontSize: '1rem' }}>
                -Rs {item.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentTransactionsMini;