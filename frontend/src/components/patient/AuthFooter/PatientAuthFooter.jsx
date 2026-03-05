export default function PatientAuthFooter() {
    return (
        <footer className="bg-transparent px-8 py-6 text-center flex items-center justify-center gap-4 flex-nowrap animate-slide-up-footer">
            <a href="#privacy" className="text-ui-500 no-underline text-sm transition-all duration-300 hover:text-ui-900">Privacy Policy</a>
            <span className="text-ui-400 text-sm">·</span>
            <a href="#terms" className="text-ui-500 no-underline text-sm transition-all duration-300 hover:text-ui-900">Terms of Service</a>
            <span className="text-ui-400 text-sm">·</span>
            <a href="#help" className="text-ui-500 no-underline text-sm transition-all duration-300 hover:text-ui-900">Help Center</a>
        </footer>
    );
}