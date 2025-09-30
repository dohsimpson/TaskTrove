/**
 * User mutation atoms
 *
 * Contains mutation atoms for user operations:
 * - Updating user profile
 */

import {
  type User,
  type UpdateUserRequest,
  type UpdateUserResponse,
  UpdateUserResponseSchema,
  UserUpdateSerializationSchema,
  type AvatarFilePath,
} from "@tasktrove/types";
import { DEFAULT_USER } from "@tasktrove/types/defaults";
import type { DataFile } from "@tasktrove/types";
import { createEntityMutation } from "./entity-factory";

// =============================================================================
// USER MUTATION ATOMS
// =============================================================================

/**
 * User update mutation atom
 *
 * Updates user profile data and optimistically applies changes.
 * Handles avatar conversion from base64 to file path.
 */
export const updateUserMutationAtom = createEntityMutation<
  User,
  UpdateUserRequest,
  UpdateUserResponse
>({
  entity: "user" as "setting", // Use "setting" entity type since user is a single object
  operation: "update",
  schemas: {
    request: UserUpdateSerializationSchema,
    response: UpdateUserResponseSchema,
  },
  apiEndpoint: "/api/user",
  logModule: "user",
  operationName: "Updated user",
  // Custom test response for user-specific avatar handling
  testResponseFactory: (variables: UpdateUserRequest) => {
    // For test mode, merge updates with default user
    // Simulate avatar conversion: base64 -> file path (in real API, this would save the file)
    let simulatedAvatarPath: AvatarFilePath | undefined = DEFAULT_USER.avatar;
    if (variables.avatar !== undefined) {
      if (variables.avatar === null) {
        // User wants to remove avatar
        simulatedAvatarPath = undefined;
      } else {
        // User uploaded new avatar (base64) - simulate saving as file
        simulatedAvatarPath =
          "assets/avatar/simulated-test-avatar.png" as AvatarFilePath;
      }
    }

    const testUser: User = {
      username: variables.username ?? DEFAULT_USER.username,
      password: variables.password ?? DEFAULT_USER.password,
      avatar: simulatedAvatarPath,
    };
    return {
      success: true,
      user: testUser,
      message: "User updated successfully (test mode)",
    };
  },
  // Custom optimistic update for user object merge
  optimisticUpdateFn: (variables: UpdateUserRequest, oldData: DataFile) => {
    // Merge partial user updates with current user data
    const updatedUser: User = {
      username: variables.username ?? oldData.user.username,
      password: variables.password ?? oldData.user.password,
      avatar: oldData.user.avatar,
    };

    return {
      ...oldData,
      user: updatedUser,
    };
  },
});
updateUserMutationAtom.debugLabel = "updateUserMutationAtom";
