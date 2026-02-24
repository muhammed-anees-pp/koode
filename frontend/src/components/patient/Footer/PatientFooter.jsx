import "../../../styles/patient/PatientFooter.css";

export default function PatientFooter() {
    return (
        <footer className="patient-footer">
            <div className="footer-grid">
                <div className="footer-col">
                    <h4>Service</h4>
                    <ul>
                        <li><a href="#">Individual Therapy</a></li>
                        <li><a href="#">Couple Therapy</a></li>
                        <li><a href="#">Family Counseling</a></li>
                        <li><a href="#">Follow Up Session</a></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Conditions</h4>
                    <ul>
                        <li><a href="#">Anxiety & Stress</a></li>
                        <li><a href="#">Depression & Mood Disorder</a></li>
                        <li><a href="#">Trauma & PTSD</a></li>
                        <li><a href="#">Relationship Issues</a></li>
                        <li><a href="#">Grief Counseling</a></li>
                        <li><a href="#">Anger Management</a></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>About</h4>
                    <ul>
                        <li><a href="#">Our Story</a></li>
                        <li><a href="#">Blog</a></li>
                        <li><a href="#">Careers</a></li>
                        <li><a href="#">Privacy Policy</a></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Connect Us</h4>
                    <p style={{ fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>+1 (555) 123-4567</p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', color: 'rgba(255,255,255,0.9)' }}>help@koode.in</p>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {/* Social Icons Placeholders */}
                        <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}></div>
                        <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}></div>
                        <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}></div>
                    </div>
                </div>

                <div className="footer-col" style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '13px', marginBottom: '16px', color: 'rgba(255,255,255,0.9)' }}>
                        Join us at koode and let's navigate this path together!
                    </p>
                    <a href="#" className="join-community">Join community</a>
                    <br />
                    <a href="#" className="hiring-badge">We're Hiring</a>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© 2026 koode. All rights reserved.</p>
            </div>
        </footer>
    );
}