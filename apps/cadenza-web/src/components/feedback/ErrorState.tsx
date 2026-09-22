import { Alert } from '@mantine/core'

export default function ErrorState({
  title = 'Something went wrong',
  description = 'We could not complete this request.',
  action,
}) {
  return (
    <Alert color="red" variant="light" title={title} role="alert">
      {description}
      {action}
    </Alert>
  )
}
