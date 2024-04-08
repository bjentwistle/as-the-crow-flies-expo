import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  Button,
  DevSettings,
  Image,
} from "react-native";

import MapView, { LatLng, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";

import { AppContext } from "../AppContext";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const INITIAL_POSITION = {
  latitude: 55.9425,
  longitude: -3.2681,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

export default function GameScreen() {
  const state = useContext(AppContext);

  const [targetObject, setTargetObject] = useState(
    state?.currentLevel?.locations[0]
  );

  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>();
  const [guessedDistance, setGuessedDistance] = useState(6371);
  const [message, setMessage] = useState("");
  const [counter, setCounter] = useState(0);
  const [locationFound, setLocationFound] = useState(false);
//   const [isThereAnotherLocation, setIsThereAnotherLocation] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  const mapRef = useRef<MapView>(null);

  const navigation = useNavigation();

  useEffect(() => {
    if (guessedDistance < 0.1) {
      setLocationFound(true);
    }
  }, [guessedDistance]);

  useEffect(() => {
    if (targetObject) {
      state?.setTargetName(targetObject?.name);
    }
  }, [targetObject]);

  if (state?.guessesRemaining === 0) {
    return (
      <SafeAreaView>
        <Text style={{ textAlign: "center" }}>YOU LOSE!</Text>
        <Button title="Try again" onPress={() => DevSettings.reload()}></Button>
      </SafeAreaView>
    );
  }

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    setGuessedDistance(distance);
    return distance;
  };

  const isThereNextLocation = () => {
    if (targetObject) {
      const currentIndex = state?.currentLevel?.locations.indexOf(targetObject);
      if (currentIndex !== -1 && currentIndex !== undefined) {
        const nextObject = state?.currentLevel?.locations[currentIndex + 1];
        if (!nextObject) {
          return false;
        } else {
          return true;
        }
      }
    }
    return false;
  }

  const nextLocation = () => {
    if (targetObject) {
      const currentIndex = state?.currentLevel?.locations.indexOf(targetObject);
      if (currentIndex !== -1 && currentIndex !== undefined) {
        const nextObject = state?.currentLevel?.locations[currentIndex + 1];
        if (!nextObject) {
          setGameOver(true);
        } else {
          setTargetObject(nextObject);
          setSelectedLocation(null);
          setGuessedDistance(6371);
          setCounter(0);
          setMessage("");
          setLocationFound(false);
          state?.setGuessesRemaining(5);
          state.setTargetName(targetObject.name);
        }
      }
    }
  };

  const handleMapPress = (event: { nativeEvent: { coordinate: LatLng } }) => {
    const { coordinate } = event.nativeEvent;
    if (!locationFound) {
      state?.setGuessesRemaining(state.guessesRemaining - 1);
      setSelectedLocation(coordinate);
    }

    if (targetObject) {
      const distance = calculateDistance(
        coordinate.latitude,
        coordinate.longitude,
        targetObject.coordinates.latitude,
        targetObject.coordinates.longitude
      );
      setMessage(`Distance to ${targetObject.name}: ${distance.toFixed(2)} km`);
    }

    if (!locationFound) {
      setCounter(counter + 1);
    }
  };

  const handlePausePress = () => {
    navigation.navigate("Pause" as never);
  };

  if (gameOver) {
    // setTargetObject(state?.currentLevel?.locations[0]);
    navigation.navigate("Win" as never);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={noLabelStyle}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_POSITION}
        onPress={handleMapPress}
        zoomEnabled={false}
      >
        {selectedLocation && <Marker coordinate={selectedLocation} />}
      </MapView>
      <View style={styles.buttonContainer}>
        <Button title="Pause" onPress={handlePausePress} />
      </View>
      {!locationFound && (
        <View style={styles.searchContainer}>
          <Text>{`Current Target: ${targetObject?.name}\nLocation ${targetObject?.positionInList} of ${state?.currentLevel.locations.length}`}</Text>
          <Text>Guesses Remaining: {state?.guessesRemaining}</Text>
        </View>
      )}
      {message !== "" && (
        <View style={styles.searchContainer}>
          <Text>{message}</Text>
          <Text>{`Location ${targetObject?.positionInList} of ${state?.currentLevel.locations.length}`}</Text>
          <Text>Guesses Remaining: {state?.guessesRemaining}</Text>
        </View>
      )}
      {locationFound && (
        <View style={styles.searchContainer}>
          <Text>{`You found ${targetObject?.name} in ${counter} guesses!`}</Text>
          <Image
            style={styles.image}
            alt={targetObject ? targetObject.name : "Your target location"}
            src={targetObject?.imageUrl}
          />
          <Button
            title="Next Location"
            color="#f194ff"
            onPress={nextLocation}
          />
        </View>
      )}
      
      {/* {gameOver && (
        <View style={styles.searchContainer}>
          <Text>You win! Now give us all jobs.</Text>
        </View>
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  searchContainer: {
    position: "absolute",
    width: "80%",
    backgroundColor: "white",
    shadowColor: "black",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    padding: 8,
    borderRadius: 8,
    top: Constants.statusBarHeight,
  },
  input: {
    borderColor: "#888",
    borderWidth: 1,
  },
  button: {
    backgroundColor: "#bbb",
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 4,
  },
  buttonText: {
    textAlign: "center",
  },
  buttonContainer: {
    position: "absolute",
    top: Constants.statusBarHeight - 10, // Adjust as needed
    left: 300, // Adjust as needed
    zIndex: 1,
    backgroundColor: "#9feced",
    borderRadius: 10,
  },
  image: {
    width: "100%",
    height: 170,
    marginLeft: "auto",
    marginRight: "auto",
  },
});

const noLabelStyle = [
  {
    elementType: "labels",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "administrative.neighborhood",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
];
