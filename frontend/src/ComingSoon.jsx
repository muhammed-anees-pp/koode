import { useEffect, useState } from 'react';
import { getStatus } from './api/status.api';
import logo from './assets/patient-logo.png';
import './App.css';

const ComingSoon = () => {
    const [status, setStatus] = useState('Checking connection...');

    useEffect(() => {
    const checkStatus = async () => {
        try {
            await getStatus();
            setStatus("System Status: Online");
        } catch (error) {
            setStatus("Status: Offline (Retrying...)");
        }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
}, []);

    return (
        <div className="coming-soon-container">
            <nav className="navbar">
                <div className="system-status">{status}</div>
            </nav>

            <main className="main-content">
                <div className="logo-container">
                    <img src={logo} alt="Koode Logo" className="brand-logo" />
                </div>

                <h1 className="headline">koode is coming soon</h1>

                <h2 className="sub-headline">A safe space for professional psychological support.</h2>

                <div className="body-text">
                    <p>
                        We’re building koode, an online psychologist consultation platform designed to make mental health care more accessible, confidential, and human.
                    </p>
                    <p>
                        Whether you’re looking for guidance, clarity, or ongoing support, koode will connect you with licensed psychologists in a space built on trust and care.
                    </p>
                    <p className="highlight-text">
                        We’re almost ready.<br />
                        Thank you for being here at the beginning.
                    </p>
                </div>
            </main>

            <footer className="footer">
                <p>&copy; koode · Mental health matters</p>
            </footer>
        </div>
    );
};

export default ComingSoon;
