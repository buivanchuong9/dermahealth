import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-base)' }}>
      <h1 style={{ fontSize: '3rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>DermaHealth</h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Tương Lai Của Chẩn Đoán Da Liễu</p>
      <Link to="/app" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem' }}>
        Mở ứng dụng
      </Link>
    </div>
  );
};

export default Home;
