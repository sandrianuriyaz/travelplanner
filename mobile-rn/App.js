import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './src/constants/theme';

import useAuthStore from './src/store/authStore';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import MapScreen from './src/screens/MapScreen';
import ResultScreen from './src/screens/ResultScreen';
import DetailScreen from './src/screens/DetailScreen';

const TAB_SCREENS = ['Home', 'Planner', 'Map', 'History'];

const TABS = [
  { name: 'Home',    label: 'Beranda',    icon: 'home-outline',    iconActive: 'home' },
  { name: 'Planner', label: 'Rencanakan', icon: 'sparkles-outline',iconActive: 'sparkles' },
  { name: 'Map',     label: 'Peta',       icon: 'map-outline',     iconActive: 'map' },
  { name: 'History', label: 'Riwayat',    icon: 'time-outline',    iconActive: 'time' },
];

function useNavigation(setActiveTab) {
  const [stack, setStack] = useState([{ name: 'Login', params: {} }]);
  const current = stack[stack.length - 1];

  const navigate = useCallback((name, params = {}) => {
    if (TAB_SCREENS.includes(name)) setActiveTab(name);
    setStack((prev) => [...prev, { name, params }]);
  }, [setActiveTab]);

  const goBack = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const s = next[next.length - 1];
      if (TAB_SCREENS.includes(s.name)) setActiveTab(s.name);
      return next;
    });
  }, [setActiveTab]);

  const replace = useCallback((name, params = {}) => {
    if (TAB_SCREENS.includes(name)) setActiveTab(name);
    setStack([{ name, params }]);
  }, [setActiveTab]);

  return { current, navigate, goBack, replace };
}

function TabBar({ activeTab, onPress }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const active = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => onPress(tab.name)}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? COLORS.white : COLORS.textHint}
              />
            </View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function App() {
  const { isLoggedIn, checkAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const { current, navigate, goBack, replace } = useNavigation(setActiveTab);

  useEffect(() => { checkAuth().finally(() => setIsReady(true)); }, []);
  useEffect(() => { if (isReady) replace(isLoggedIn ? 'Home' : 'Login'); }, [isLoggedIn, isReady]);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <View style={styles.splashLogo}>
          <Ionicons name="airplane" size={52} color={COLORS.white} />
        </View>
        <Text style={styles.splashTitle}>Travel Planner</Text>
        <Text style={styles.splashSub}>Rencanakan perjalanan impianmu</Text>
        <ActivityIndicator color="rgba(255,255,255,0.6)" size="large" style={{ marginTop: 40 }} />
      </View>
    );
  }

  const isTabScreen = TAB_SCREENS.includes(current.name) && isLoggedIn;
  const nav = { navigate, goBack, replace };

  function renderScreen() {
    switch (current.name) {
      case 'Login':    return <LoginScreen nav={nav} />;
      case 'Register': return <RegisterScreen nav={nav} />;
      case 'Home':     return <HomeScreen nav={nav} />;
      case 'Planner':  return <PlannerScreen nav={nav} />;
      case 'Map':      return <MapScreen nav={nav} />;
      case 'Explore':  return <ExploreScreen nav={nav} />;
      case 'History':  return <HistoryScreen nav={nav} />;
      case 'Result':   return <ResultScreen nav={nav} params={current.params} />;
      case 'Detail':   return <DetailScreen nav={nav} params={current.params} />;
      default:         return <LoginScreen nav={nav} />;
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.flex}>{renderScreen()}</View>
      {isTabScreen && (
        <TabBar activeTab={activeTab} onPress={(name) => { setActiveTab(name); replace(name); }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  flex: { flex: 1, backgroundColor: COLORS.background },
  splash: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  splashLogo: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  splashTitle: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  splashSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 4 : 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 }, shadowRadius: 10, elevation: 12,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIconWrap: {
    width: 40, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 3,
  },
  tabIconWrapActive: { backgroundColor: COLORS.primary },
  tabLabel: { fontSize: 11, color: COLORS.textHint, fontWeight: '500' },
  tabLabelActive: { color: COLORS.primary, fontWeight: '700' },
});
