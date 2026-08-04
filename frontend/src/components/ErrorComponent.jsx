const ErrorComponent = ({ message = 'Something went wrong.' }) => (
  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
    <p className="font-medium">Unable to load this section</p>
    <p className="mt-1">{message}</p>
  </div>
);

export default ErrorComponent;
