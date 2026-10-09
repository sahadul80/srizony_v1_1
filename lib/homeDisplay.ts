import { contentData, systemData } from '../data/data'
export function getHomeDisplay() { return { page: contentData.allPages['/'], hero: systemData.homeHero } }
