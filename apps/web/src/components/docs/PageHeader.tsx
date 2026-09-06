type Props = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: Props) {
  return (
    <header className="border-b pb-6 mb-8">
      <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-3 text-lg text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
