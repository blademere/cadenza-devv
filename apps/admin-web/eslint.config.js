import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { createReactConfig } from '../../eslint.config.mjs'

export default createReactConfig({ reactHooks, reactRefresh })
