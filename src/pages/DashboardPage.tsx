import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/PageLayout";

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <PageLayout 
      title="Dashboard" 
      description={`Welcome back, ${user?.email?.split('@')[0] || "User"}!`}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>View and manage your profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Manage your account settings here.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Manage your subscription plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>View your current plan and billing details.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
            <CardDescription>Get help and support.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Contact our support team if you have questions.</p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default DashboardPage;