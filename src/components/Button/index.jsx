import styles from './Button.module.css';

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', // Pode ser 'primary' (Dourado), 'secondary' (Preto), 'silver' (Prata), ou 'brown' (Marrom)
  type = 'button', 
  className = '' 
}) {
  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={`${styles.button} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
