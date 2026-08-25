import {
  Alert as MuiAlert,
  Avatar as MuiAvatar,
  Box as MuiBox,
  Button as MuiButton,
  Card as MuiCard,
  CardContent,
  Chip,
  CircularProgress,
  CssBaseline,
  Divider as MuiDivider,
  FormControl,
  MenuItem,
  Select as MuiSelect,
  Switch as MuiSwitch,
  TextField,
  ThemeProvider,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { adminTheme } from '../../theme'

const spacingMap = { none: 0, xs: 0.5, sm: 1, md: 1.5, lg: 2, xl: 3 }
const textSizes = {
  '2xs': '0.7rem',
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '2.25rem',
}

export const Box = ({ children, sx, ...props }) => (
  <MuiBox sx={sx} {...props}>{children}</MuiBox>
)

export const HStack = ({ children, space, sx, ...props }) => (
  <MuiBox
    sx={{ display: 'flex', flexDirection: 'row', gap: spacingMap[space], ...sx }}
    {...props}
  >
    {children}
  </MuiBox>
)

export const VStack = ({ children, space, sx, ...props }) => (
  <MuiBox
    sx={{ display: 'flex', flexDirection: 'column', gap: spacingMap[space], ...sx }}
    {...props}
  >
    {children}
  </MuiBox>
)

export const Text = ({ children, size = 'md', bold = false, sx, ...props }) => (
  <Typography
    sx={{ fontSize: textSizes[size] ?? size, fontWeight: bold ? 700 : undefined, ...sx }}
    {...props}
  >
    {children}
  </Typography>
)

export const Heading = ({ children, size = 'md', sx, ...props }) => {
  const variant = ({
    sm: 'h6', md: 'h5', lg: 'h4', xl: 'h3', '2xl': 'h2', '3xl': 'h1',
  })[size] ?? 'h5'

  return (
    <Typography variant={variant} sx={{ fontWeight: 700, ...sx }} {...props}>
      {children}
    </Typography>
  )
}

const buttonVariant = { solid: 'contained', outline: 'outlined', link: 'text' }

export const Button = ({
  children,
  variant = 'solid',
  size = 'md',
  onPress,
  isDisabled,
  sx,
  ...props
}) => (
  <MuiButton
    variant={buttonVariant[variant] ?? variant}
    size={size === 'lg' ? 'large' : size === 'sm' ? 'small' : 'medium'}
    onClick={onPress}
    disabled={isDisabled}
    sx={{ textTransform: 'none', ...sx }}
    {...props}
  >
    {children}
  </MuiButton>
)

export const ButtonText = ({ children }) => <>{children}</>

export const Card = ({ children, sx, ...props }) => (
  <MuiCard sx={{ borderRadius: 2, ...sx }} {...props}>
    <CardContent sx={{ '&:last-child': { pb: 2 } }}>{children}</CardContent>
  </MuiCard>
)

export const Badge = ({ children, action = 'info', variant = 'solid', size = 'md', sx, ...props }) => {
  const color = ({ success: 'success', warning: 'warning', error: 'error', info: 'info' })[action] ?? 'default'

  return (
    <Chip
      color={color}
      variant={variant === 'outline' ? 'outlined' : 'filled'}
      size={size === 'sm' ? 'small' : 'medium'}
      label={children}
      sx={sx}
      {...props}
    />
  )
}

export const BadgeText = ({ children }) => <>{children}</>

export const Input = ({ children, sx, ...props }) => (
  <MuiBox sx={{ width: '100%', ...sx }} {...props}>{children}</MuiBox>
)

export const InputField = ({ onChangeText, ...props }) => (
  <TextField
    fullWidth
    onChange={(event) => onChangeText?.(event.target.value)}
    {...props}
  />
)

export const Divider = (props) => <MuiDivider {...props} />

export const Avatar = ({ children, size = 'md', sx, ...props }) => (
  <MuiAvatar
    sx={{
      width: size === 'sm' ? 32 : 40,
      height: size === 'sm' ? 32 : 40,
      ...sx,
    }}
    {...props}
  >
    {children}
  </MuiAvatar>
)

export const AvatarFallbackText = ({ children }) => (
  <Text size="xs" bold>
    {String(children ?? '')
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()}
  </Text>
)

export const Spinner = (props) => <CircularProgress size={20} {...props} />

export const Switch = ({ value, onValueChange, isDisabled, ...props }) => (
  <MuiSwitch
    checked={Boolean(value)}
    onChange={(event) => onValueChange?.(event.target.checked)}
    disabled={isDisabled}
    {...props}
  />
)

export const Select = ({ children, selectedValue = '', onValueChange, sx, ...props }) => (
  <FormControl fullWidth size="small" sx={sx} {...props}>
    <MuiSelect
      value={selectedValue}
      onChange={(event) => onValueChange?.(event.target.value)}
      IconComponent={ExpandMoreIcon}
      displayEmpty
    >
      {children}
    </MuiSelect>
  </FormControl>
)

export const SelectTrigger = ({ children }) => <>{children}</>
export const SelectInput = ({ placeholder }) => (
  placeholder ? <MenuItem value="" disabled>{placeholder}</MenuItem> : null
)
export const SelectIcon = () => null
export const SelectPortal = ({ children }) => <>{children}</>
export const SelectBackdrop = () => null
export const SelectContent = ({ children }) => <>{children}</>
export const SelectItem = ({ label, value }) => <MenuItem value={value}>{label}</MenuItem>
export const ChevronDownIcon = ExpandMoreIcon

export const Alert = ({ children, severity = 'info', ...props }) => (
  <MuiAlert severity={severity} {...props}>{children}</MuiAlert>
)

export const AlertText = ({ children }) => <>{children}</>

export function MuiAppThemeProvider({ children }) {
  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
