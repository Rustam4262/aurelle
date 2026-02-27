import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { logger } from "@/lib/logger";

// Convert base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface VapidKeyResponse {
  publicKey: string;
}

interface Subscription {
  id: string;
  endpoint: string;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Check if push notifications are supported
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Get VAPID public key
  const { data: vapidKey } = useQuery<string | null>({
    queryKey: ["/api/push/vapid-public-key"],
    queryFn: async (): Promise<string | null> => {
      try {
        const response = await apiRequest("GET", "/api/push/vapid-public-key");
        const data = (await response.json()) as VapidKeyResponse;
        return data.publicKey;
      } catch {
        logger.info("Push notifications not configured on server");
        return null;
      }
    },
    enabled: isSupported && !!user,
  });

  // Subscribe to push notifications
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!isSupported) {
        throw new Error("Push notifications are not supported in your browser");
      }

      if (!vapidKey) {
        throw new Error("Push notifications are not configured on the server");
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== "granted") {
        throw new Error("Notification permission denied");
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      // Send subscription to server
      const subscriptionData = subscription.toJSON();
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subscriptionData.endpoint,
        keys: subscriptionData.keys,
      });

      return subscription;
    },
    onSuccess: () => {
      toast({
        title: "Notifications enabled",
        description: "You will now receive push notifications",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/push/subscriptions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to enable notifications",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unsubscribe from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!isSupported) {
        throw new Error("Push notifications are not supported");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        throw new Error("No active subscription found");
      }

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Remove subscription from server
      const subscriptionData = subscription.toJSON();
      await apiRequest("POST", "/api/push/unsubscribe", {
        endpoint: subscriptionData.endpoint,
      });
    },
    onSuccess: () => {
      toast({
        title: "Notifications disabled",
        description: "You will no longer receive push notifications",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/push/subscriptions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to disable notifications",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test push notification
  const testMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/push/test", {});
    },
    onSuccess: () => {
      toast({
        title: "Test notification sent",
        description: "Check if you received it!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send test notification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get current subscription status
  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/push/subscriptions"],
    queryFn: async (): Promise<Subscription[]> => {
      const response = await apiRequest("GET", "/api/push/subscriptions");
      return response.json() as Promise<Subscription[]>;
    },
    enabled: isSupported && !!user && !!vapidKey,
  });

  const isSubscribed = subscriptions && subscriptions.length > 0;

  return {
    isSupported,
    permission,
    isSubscribed,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    sendTestNotification: testMutation.mutate,
    isSendingTest: testMutation.isPending,
  };
}
