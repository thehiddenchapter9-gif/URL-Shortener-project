import ShortenForm from './components/ShortenForm.jsx';
import StatsLookup from './components/StatsLookup.jsx';

export default function App() {
  return (
    <div className="page">
      <header className="header">
        <h1>Coil</h1>
        <p>Сокращайте ссылки и следите за переходами.</p>
      </header>

      <main className="content">
        <ShortenForm />
        <StatsLookup />
      </main>
    </div>
  );
}
