import { Link } from "react-router"

export type ButtonType = {
  children?: string,
  to: string,
  
}

const Button = ({children, to}: ButtonType) => {
  return (
    <div className="flex gap-2 items-baseline">
      <Link className="py-1.5 px-12 bg-rose-400 text-white font-semibold rounded-l-full" to={to}>{children}</Link>
      <button className="py-1.5 px-1 bg-rose-400 text-white font-semibold rounded-r-full">Test</button>
    </div>
  )
}

export default Button