export default function PatientFooter() {
    const colTitleCls = "text-white text-sm font-semibold uppercase tracking-[0.08em] mb-4";
    const linkCls = "text-white/70 no-underline text-sm transition-all duration-200 hover:text-patient-primary hover:pl-1";

    return (
        <footer className="bg-[#1a2233] text-white pt-14 pb-6 px-8 mt-auto">
            <div className="max-w-[1200px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-10 pb-10 border-b border-white/10">
                <div>
                    <h4 className={colTitleCls}>Service</h4>
                    <ul className="list-none p-0 m-0 flex flex-col gap-3">
                        <li><a href="#" className={linkCls}>Individual Therapy</a></li>
                        <li><a href="#" className={linkCls}>Couple Therapy</a></li>
                        <li><a href="#" className={linkCls}>Family Counseling</a></li>
                        <li><a href="#" className={linkCls}>Follow Up Session</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className={colTitleCls}>Conditions</h4>
                    <ul className="list-none p-0 m-0 flex flex-col gap-3">
                        <li><a href="#" className={linkCls}>Anxiety & Stress</a></li>
                        <li><a href="#" className={linkCls}>Depression & Mood Disorder</a></li>
                        <li><a href="#" className={linkCls}>Trauma & PTSD</a></li>
                        <li><a href="#" className={linkCls}>Relationship Issues</a></li>
                        <li><a href="#" className={linkCls}>Grief Counseling</a></li>
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
                    <p className="text-sm mb-2 text-white/90">+1 (555) 123-4567</p>
                    <p className="text-sm mb-4 text-white/90">help@koode.in</p>
                    <div className="flex gap-2.5">
                        <div className="w-[30px] h-[30px] bg-white/20 rounded-full" />
                        <div className="w-[30px] h-[30px] bg-white/20 rounded-full" />
                        <div className="w-[30px] h-[30px] bg-white/20 rounded-full" />
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-[13px] mb-4 text-white/90">Join us at koode and let's navigate this path together!</p>
                    <a href="#" className="inline-block px-5 py-2.5 bg-patient-primary text-white text-sm font-semibold no-underline rounded-[20px] transition-all duration-200 hover:bg-patient-hover">Join community</a>
                    <br />
                    <a href="#" className="inline-block mt-2 px-4 py-1.5 bg-white/10 text-white text-xs font-semibold no-underline rounded-[20px] border border-white/20 transition-all duration-200 hover:bg-white/20">We're Hiring</a>
                </div>
            </div>

            <div className="text-center pt-6 text-white/40 text-xs max-w-[1200px] mx-auto">
                <p>© 2026 koode. All rights reserved.</p>
            </div>
        </footer>
    );
}