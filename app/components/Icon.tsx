import { Activity, ArrowRight, BookOpen, BriefcaseBusiness, Building2, Check, Coins, Droplets, HeartHandshake, Leaf, Megaphone, Scale, ShieldCheck, Sun, Users, Play, type LucideProps } from 'lucide-react'
import type { IconName } from '../../types/entityType'
const icons:Record<IconName,React.ComponentType<LucideProps>>={heart:HeartHandshake,leaf:Leaf,book:BookOpen,scale:Scale,users:Users,sun:Sun,droplets:Droplets,briefcase:BriefcaseBusiness,coins:Coins,building:Building2,megaphone:Megaphone,shield:ShieldCheck,play:Play,arrow:ArrowRight,check:Check}
export default function Icon({name,...props}:{name:IconName}&LucideProps){const C=icons[name]||Activity;return <C {...props}/>} 
