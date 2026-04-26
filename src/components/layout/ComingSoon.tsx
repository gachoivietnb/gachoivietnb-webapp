type Props = {
  title: string
  phase: string
  description?: string
}

export default function ComingSoon({ title, phase, description }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-medium mb-4">{title}</h1>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <div className="text-5xl mb-3">🚧</div>
        <p className="text-gray-700 dark:text-gray-300 font-medium">Module này sẽ được build trong {phase}</p>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{description}</p>}
      </div>
    </div>
  )
}
