// Kept thin and test-free: everything under src/app/ is a route for expo-router, which
// would otherwise try to load a co-located test file as a screen.
export { HomeScreen as default } from '@/screens/home-screen';
