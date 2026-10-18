import StatePage from '@/components/pages/StatePage'

export default function NotFound() {
  return <StatePage
    label="404"
    title="Page not found"
    message="The requested page does not exist or has moved."
    actionLabel="Back to home"
    actionHref="/"
  />
}
