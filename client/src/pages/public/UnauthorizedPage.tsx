import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";

export function UnauthorizedPage() {
  const { user, logout } = useAuth();

  const getDashboardLink = () => {
    if (!user) return "/";
    if (user.role === "ADMIN") return "/admin/dashboard";
    if (user.role === "LAWYER") return "/lawyer/dashboard";
    return "/dashboard";
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border border-destructive/20 bg-destructive/5 glass-panel">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto ring-4 ring-destructive/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <Badge variant="destructive">Access Restricted (403)</Badge>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Unauthorized Portal Access
          </h1>
          <p className="text-sm text-muted-foreground">
            You do not possess the required authorization credentials or role privileges to view this section of
            NyayaPacket AI.
          </p>
        </div>

        {user && (
          <div className="p-3 rounded-lg bg-background/60 border border-border text-xs text-muted-foreground flex items-center justify-between">
            <span>Current Signed-in Account:</span>
            <Badge variant="secondary">{user.role}</Badge>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to={getDashboardLink()} className="w-full sm:w-auto">
            <Button variant="default" size="sm" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Safe Portal
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" /> Switch Account
          </Button>
        </div>
      </div>
    </div>
  );
}
