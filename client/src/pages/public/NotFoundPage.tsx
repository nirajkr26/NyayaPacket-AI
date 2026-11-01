import { Link } from "react-router-dom";
import { Scale, Home, Search, ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border border-border glass-panel">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Scale className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-extrabold text-foreground tracking-tight">404</span>
          <h1 className="text-xl font-bold text-foreground">Record or Page Not Found</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            The legal brief, document record, or route you are searching for does not exist in the court registry or
            has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="default" size="sm" className="w-full gap-2">
              <Home className="w-4 h-4" /> Platform Home
            </Button>
          </Link>
          <Link to="/lawyers" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Search className="w-4 h-4" /> Find Lawyers <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
