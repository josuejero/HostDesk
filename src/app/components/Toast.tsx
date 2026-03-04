type Props = { message: string }

const Toast = ({ message }: Props) => (
  <div className="toast" role="status" aria-live="polite" aria-atomic="true">
    {message}
  </div>
)

export default Toast
