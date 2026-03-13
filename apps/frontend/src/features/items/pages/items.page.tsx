import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/components/feedback/Skeleton";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { fetchMenu } from "../services/menuService";

export default function ItemsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["menu"],
    queryFn: () => fetchMenu(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
          <p className="text-muted-foreground">
            Browse categories and items, then create an order.
          </p>
        </div>
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
        </div>
        <ErrorState
          title="Could not load menu"
          message={(error as Error).message}
          onRetry={() => refetch()}
          retryLabel="Reload menu"
        />
      </div>
    );
  }

  const categories = data?.categories ?? [];
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
        <p className="text-muted-foreground">
          Browse categories and items, then create an order. Some items are customizable (protein,
          toppings, sauces).
        </p>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          title="No menu items yet"
          description="Run the API seed script or add items to see the menu."
          action={
            <Link to="/orders/new">
              <Button variant="outline" size="sm">
                New order
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              <h2 id={`cat-${cat.id}`} className="mb-4 text-lg font-semibold">
                {cat.name}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((item) => (
                  <Card key={item.id}>
                    <CardHeader className="pb-2">
                      <CardTitle>{item.name}</CardTitle>
                      {item.description ? (
                        <CardDescription>{item.description}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">
                        {(item.priceCents / 100).toFixed(2)} USD
                        {item.modifierGroups && item.modifierGroups.length > 0 ? (
                          <span className="text-muted-foreground"> — customizable</span>
                        ) : null}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div>
        <Link to="/orders/new">
          <Button>Create order</Button>
        </Link>
      </div>
    </div>
  );
}
