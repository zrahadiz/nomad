import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../constants/theme";

export default function Screen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen Title</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
});
