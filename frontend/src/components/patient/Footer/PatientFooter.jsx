export default function PatientFooter() {
    const colTitleCls = "text-white text-sm font-bold uppercase tracking-[0.1em] mb-5";
    const linkCls = "text-white/70 no-underline text-sm transition-all duration-200 hover:text-white hover:pl-1 block";

    return (
        <footer className="bg-patient-primary text-white pt-14 pb-6 px-8 mt-auto">
            <div className="max-w-[1200px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-10 pb-10 border-b border-white/20">
                
                <div>
                    <h4 className={colTitleCls}>Service</h4>
                    <ul className="list-none p-0 m-0 flex flex-col gap-3">
                        <li><a href="#" className={linkCls}>Individual Consultation</a></li>
                        <li><a href="#" className={linkCls}>Couple Consultation</a></li>
                        <li><a href="#" className={linkCls}>Family Counseling</a></li>
                        <li><a href="#" className={linkCls}>Follow Up Session</a></li>
                    </ul>
                </div>

                
                <div>
                    <h4 className={colTitleCls}>Conditions</h4>
                    <ul className="list-none p-0 m-0 flex flex-col gap-3">
                        <li><a href="#" className={linkCls}>Anxiety &amp; Stress</a></li>
                        <li><a href="#" className={linkCls}>Depression &amp; Mood Disorder</a></li>
                        <li><a href="#" className={linkCls}>Trauma &amp; PTSD</a></li>
                        <li><a href="#" className={linkCls}>Relationship Issues</a></li>
                        <li><a href="#" className={linkCls}>Grief Counselling</a></li>
                        <li><a href="#" className={linkCls}>Anger Management</a></li>
                    </ul>
                </div>

                
                <div>
                    <h4 className={colTitleCls}>About</h4>
                    <ul className="list-none p-0 m-0 flex flex-col gap-3">
                        <li><a href="#" className={linkCls}>Our Story</a></li>
                        <li><a href="#" className={linkCls}>Blog</a></li>
                        <li><a href="#" className={linkCls}>Careers</a></li>
                        <li><a href="#" className={linkCls}>Privacy Policy</a></li>
                    </ul>
                </div>

                
                <div>
                    <h4 className={colTitleCls}>Connect Us</h4>
                    <p className="text-sm mb-1 text-white/90">+1 (555) 123-4567</p>
                    <p className="text-sm mb-4 text-white/90">help@koode.in</p>
                    <div className="flex gap-2.5">
                        
                        {["Y", "IG", "TH", "YT"].map((s) => (
                            <div key={s} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-[9px] font-bold cursor-pointer hover:bg-white/30 transition">
                                {s}
                            </div>
                        ))}
                    </div>
                </div>

                
                <div>
                    <p className="text-sm mb-4 text-white leading-relaxed">
                        Join us at koode and let's navigate this path together!
                    </p>
                    <a
                        href="#"
                        className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold no-underline rounded-xl transition-all duration-200 hover:bg-slate-800 mb-2"
                    >
                        Join community
                    </a>
                    <br />
                    <a
                        href="#"
                        className="inline-block mt-2 px-4 py-1.5 bg-transparent text-white text-xs font-semibold no-underline rounded-xl border-2 border-white/60 transition-all duration-200 hover:bg-white/10"
                    >
                        We're Hiring
                    </a>
                </div>
            </div>

            
            <div className="max-w-[1200px] mx-auto pt-6 text-center text-white/60 text-xs leading-relaxed">
                <p>
                    Koode does not deal with medical or psychological emergencies. We are not designed to offer support in crisis situations — including when an individual is
                    experiencing thoughts of self-harm or suicide, or is showing symptoms of severe clinical disorders such as schizophrenia and other psychotic conditions.
                    In these cases, In-person medical intervention is the most appropriate form of help.
                </p>
                <p className="mt-4 text-white/40">© 2026 koode. All rights reserved.</p>
            </div>
        </footer>
    );
}