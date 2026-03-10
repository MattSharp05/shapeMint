import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-brand-dark border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <img
              src="/images/shapemint-long-twolines.png"
              alt="ShapeMint"
              className="h-12 w-auto mb-3"
            />
            <p className="text-[#9ca3af] text-sm max-w-xs">
              AI-powered 3D model generation and printing. From idea to your door.
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3">Platform</h4>
              <ul className="space-y-2">
                <li><Link to="/generate" className="text-sm text-[#9ca3af] hover:text-white transition-colors">Create</Link></li>
                <li><Link to="/dashboard" className="text-sm text-[#9ca3af] hover:text-white transition-colors">My Models</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-3">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-[#9ca3af] hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-[#9ca3af] hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6">
          <p className="text-[#6b7280] text-xs">
            &copy; {new Date().getFullYear()} ShapeMint. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
